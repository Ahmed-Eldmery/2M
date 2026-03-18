// @ts-ignore: Deno standard library
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Supabase JS library
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore: Deno is available in Supabase Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore: Deno is available in Supabase Edge Functions
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase environment variables are missing');
    }
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if setup is already complete (via system_settings)
    const { data: settingsData } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'owner_setup_complete')
      .maybeSingle();

    if (settingsData?.value === true) {
      return new Response(
        JSON.stringify({ error: 'Owner setup has already been completed' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if any owner role exists (double check)
    const { data: existingOwners, error: ownerCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'owner')
      .limit(1);

    if (ownerCheckError) {
      console.error('Error checking existing owners:', ownerCheckError);
      throw ownerCheckError;
    }

    if (existingOwners && existingOwners.length > 0) {
      // Mark setup as complete and return error
      await supabaseAdmin
        .from('system_settings')
        .upsert({ key: 'owner_setup_complete', value: true });

      return new Response(
        JSON.stringify({ error: 'An owner already exists in the system' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get request body
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and name are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate password strength (at least 6 characters)
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Cleaning up existing non-owner users...');

    // Optimize cleanup: Disable any existing users who are NOT owners
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 100
      });

      if (listError || !users || users.length === 0) {
        hasMore = false;
        break;
      }

      // Filter users who might already be owners
      const userIds = users.map((u: any) => u.id);
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .in('user_id', userIds)
        .eq('role', 'owner');
      
      const ownerIds = new Set(roles?.map((r: any) => r.user_id) || []);

      for (const user of users) {
        if (!ownerIds.has(user.id)) {
          console.log('Disabling previous user:', user.email);
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            ban_duration: '876000h' // ~100 years
          });
        }
      }

      if (users.length < 100) hasMore = false;
      else page++;
    }

    console.log('Creating/Updating owner account for:', email);

    // Try to create the new owner user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'owner' }
    });

    let targetUserId = newUser?.user?.id;

    if (createError) {
      // If user already exists, we recover and update them
      if (createError.message.includes('already been registered')) {
        console.log('User already exists, checking status...');
        
        // Find the user ID by email using iterative search to be safe
        let searchPage = 1;
        let foundUser = null;
        while (!foundUser) {
          const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers({
            page: searchPage,
            perPage: 100
          });
          
          if (searchError || !users || users.length === 0) break;
          
          foundUser = users.find((u: any) => u.email === email);
          if (foundUser || users.length < 100) break;
          searchPage++;
        }
        
        if (foundUser) {
          console.log('Updating existing user to owner:', foundUser.id);
          targetUserId = foundUser.id;
          await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
            password,
            email_confirm: true,
            ban_duration: 'none',
            user_metadata: { name, role: 'owner' }
          });
        } else {
          throw createError;
        }
      } else {
        throw createError;
      }
    }

    if (!targetUserId) {
      throw new Error('Failed to resolve user ID');
    }


    // Assign owner role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ 
        user_id: targetUserId, 
        role: 'owner' 
      }, { 
        onConflict: 'user_id,role' 
      });

    if (roleError) {
      console.error('Error assigning owner role:', roleError);
      throw roleError;
    }

    // Create/update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: targetUserId,
        name,
        email
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // We don't throw here as the main setup (auth + role) is done
    }

    // Mark setup as complete
    const { error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .upsert({ key: 'owner_setup_complete', value: true });

    if (settingsError) {
      console.error('Error finalizing setup in settings:', settingsError);
    }

    console.log('Owner setup completed successfully for:', targetUserId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Owner account setup successfully',
        userId: targetUserId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Setup owner error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

