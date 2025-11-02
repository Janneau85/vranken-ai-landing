import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      throw new Error('Forbidden: Admin access required');
    }

    const url = new URL(req.url);
    const userId = url.pathname.split('/').pop();

    // List all users
    if (req.method === 'GET' && userId === 'admin-users') {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) throw error;

      // Fetch profiles for all users
      const userIds = users.map(u => u.id);
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      // Fetch roles for all users
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const usersWithData = users.map(user => {
        const profile = profiles?.find(p => p.id === user.id);
        const userRoles = roles?.filter(r => r.user_id === user.id).map(r => r.role) || [];
        
        return {
          id: user.id,
          email: user.email,
          name: profile?.name || null,
          roles: userRoles,
          created_at: user.created_at,
          email_confirmed_at: user.email_confirmed_at,
        };
      });

      return new Response(
        JSON.stringify({ users: usersWithData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new user
    if (req.method === 'POST') {
      const { email, password, name } = await req.json();

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || '' }
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ user: newUser }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user
    if (req.method === 'PATCH' && userId && userId !== 'admin-users') {
      const { email, name } = await req.json();

      const updates: any = {};
      if (email) updates.email = email;
      if (name !== undefined) updates.user_metadata = { name };

      const { data: updatedUser, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        updates
      );

      if (error) throw error;

      return new Response(
        JSON.stringify({ user: updatedUser }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete user
    if (req.method === 'DELETE' && userId && userId !== 'admin-users') {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Method not allowed');

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: error.message === 'Unauthorized' ? 401 : error.message.includes('Forbidden') ? 403 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
