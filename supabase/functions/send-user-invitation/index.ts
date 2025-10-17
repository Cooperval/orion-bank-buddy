import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  fullName: string;
  password: string;
  companyName: string;
  companyId: string;
  role: 'operador' | 'gestor';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, password, companyName, companyId, role }: InvitationRequest = await req.json();

    console.log('Creating user for:', email);

    // Create service role client for all operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user already exists
    console.log('Checking if user exists...');
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw new Error(`Failed to check existing users: ${listError.message}`);
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    let userId: string;

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      userId = existingUser.id;

      // Update existing profile
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: userId,
          full_name: fullName,
          company_id: companyId
        }, {
          onConflict: 'user_id'
        });

      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError);
      }

      // Update role
      const { error: updateRoleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: role
        }, {
          onConflict: 'user_id'
        });

      if (updateRoleError) {
        console.error('Error updating role:', updateRoleError);
      }

      // Check if email is confirmed
      if (!existingUser.email_confirmed_at) {
        console.log('Resending confirmation email...');
        // Note: There's no direct way to resend confirmation via admin API
        // The user will need to use password reset flow
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Usuário já existe. Perfil e permissões foram atualizados.`,
        userId: userId,
        userExists: true
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Create new user
    console.log('Creating new user...');
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        company_name: companyName
      }
    });

    if (userError) {
      console.error('Error creating user:', userError);
      throw new Error(`Failed to create user: ${userError.message}`);
    }

    userId = userData.user.id;
    console.log('User created successfully:', userId);

    // Helper function to verify user with retries
    const verifyUserWithRetry = async (attemptNumber: number = 1): Promise<boolean> => {
      const delays = [0, 2000, 5000]; // immediate, 2s, 5s
      
      if (attemptNumber > 1) {
        console.log(`Retry attempt ${attemptNumber}, waiting ${delays[attemptNumber - 1]}ms...`);
        await new Promise(resolve => setTimeout(resolve, delays[attemptNumber - 1]));
      }

      const { data: verifyUser, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (verifyError || !verifyUser) {
        if (attemptNumber < 3) {
          return verifyUserWithRetry(attemptNumber + 1);
        }
        return false;
      }
      
      return true;
    };

    // Verify user exists with retry logic
    console.log('Verifying user in auth.users...');
    const userVerified = await verifyUserWithRetry();
    
    if (!userVerified) {
      console.error('User not found after multiple retries');
      throw new Error('Usuário criado mas não foi possível verificar. Tente novamente em alguns instantes.');
    }
    
    console.log('User verified in auth.users');
    
    // Create or update profile using upsert
    console.log('Creating/updating profile...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        full_name: fullName,
        company_id: companyId
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      });

    if (profileError) {
      console.error('Error upserting profile:', profileError);
      throw new Error(`Failed to create/update profile: ${profileError.message}`);
    }

    console.log('Profile created/updated successfully');

    // Create or update role in user_roles table using upsert
    console.log('Creating/updating user role...');
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: role
      }, {
        onConflict: 'user_id,role',
        ignoreDuplicates: false
      });

    if (roleError) {
      console.error('Error upserting user role:', roleError);
      throw new Error(`Failed to create/update user role: ${roleError.message}`);
    }

    console.log('User role created/updated successfully');

    return new Response(JSON.stringify({
      success: true,
      message: `Usuário criado com sucesso! O usuário já pode fazer login com a senha definida.`,
      userId: userId
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-user-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);