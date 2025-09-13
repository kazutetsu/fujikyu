export default {
  async fetch(request, env) {
    const { results } = await env.DB.prepare("SELECT 'Hello from D1' as msg").all();
    return new Response(JSON.stringify(results));
  }
}
