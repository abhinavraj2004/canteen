import http from 'k6/http';

export let options = {
  vus: 1000, // 1000 virtual users
  duration: '1m', // over 1 minute
};

export default function () {
  http.get('https://ovvddskbsmcafkmfkozp.supabase.co/rest/v1/bookings', {
    headers: {
      apikey: 'sb_publishable_J7E5D9cF3xUDqRXsSnyMTw_PwCilJLs',
      Authorization: 'Bearer sb_publishable_J7E5D9cF3xUDqRXsSnyMTw_PwCilJLs',
      Prefer: 'count=exact', // If you want the count in response
    }
  });
}