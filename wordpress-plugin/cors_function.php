/**
* Add CORS headers to REST API responses
*/
public function add_cors_headers( $served, $result, $request, $server ) {
// Only add CORS headers for our custom endpoints
if ( strpos( $request->get_route(), '/cg/v1/' ) !== false ) {
header( 'Access-Control-Allow-Origin: *' );
header( 'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS' );
header( 'Access-Control-Allow-Headers: Content-Type, Authorization' );
header( 'Access-Control-Allow-Credentials: true' );
}

return $served;
}