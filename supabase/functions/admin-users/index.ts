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

    // Validate JWT and get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    // Check admin role
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    if (roleError) throw roleError;
    if (!isAdmin) throw new Error('Forbidden: Admin access required');

    // Helper: List users with profiles and roles
    const listUsers = async () => {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;

      const userIds = users.map((u) => u.id);

      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const usersWithData = users.map((u) => {
        const profile = profiles?.find((p) => p.id === u.id);
        const userRoles = roles?.filter((r) => r.user_id === u.id).map((r) => r.role) || [];
        return {
          id: u.id,
          email: u.email,
          name: profile?.name || null,
          roles: userRoles,
          created_at: u.created_at,
          email_confirmed_at: u.email_confirmed_at,
        };
      });

      return usersWithData;
    };

    // Support GET for listing for compatibility
    if (req.method === 'GET') {
      const usersWithData = await listUsers();
      return new Response(
        JSON.stringify({ users: usersWithData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (_) {
      payload = {};
    }

    const action = payload.action as string | undefined;

    if (action === 'list') {
      const usersWithData = await listUsers();
      return new Response(
        JSON.stringify({ users: usersWithData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create') {
      const { email, password, name } = payload;
      if (!email || !password) throw new Error('Email and password are required');

      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || '' }
      });
      if (error) throw error;

      // Create profile row if name provided (no trigger exists)
      if (newUser.user?.id) {
        await supabaseAdmin
          .from('profiles')
          .insert({ id: newUser.user.id, name: name || null })
          .select()
          .maybeSingle();
      }

      return new Response(
        JSON.stringify({ user: newUser }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update') {
      const { userId, email, name } = payload;
      if (!userId) throw new Error('userId is required');

      const updates: any = {};
      if (email) updates.email = email;
      if (name !== undefined) updates.user_metadata = { name };

      const { data: updatedUser, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        updates
      );
      if (error) throw error;

      if (name !== undefined) {
        await supabaseAdmin
          .from('profiles')
          .upsert({ id: userId, name: name || null }, { onConflict: 'id' })
          .select()
          .maybeSingle();
      }

      return new Response(
        JSON.stringify({ user: updatedUser }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      const { userId } = payload;
      if (!userId) throw new Error('userId is required');

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
