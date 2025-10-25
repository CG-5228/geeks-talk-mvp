# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - E2EE 1v1 Random Voice Chat Refinement

### Added
- **Enhanced Security**: Input validation with Zod schemas for all API endpoints
- **Rate Limiting**: Per-user rate limits (5 queue/min, 30 status/min, 10 token/min)
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Telemetry**: Anonymous metrics for debugging (no PII logging)
- **Atomic Operations**: Redis transactions ensure data consistency
- **Queue Management**: Bounded queue operations to prevent O(n²) performance issues
- **Client State Machine**: Proper view state management with error recovery
- **Unit Tests**: Comprehensive test coverage for crypto functions and queue operations
- **Integration Tests**: End-to-end testing of matching and E2EE flow
- **Documentation**: Updated with refined implementation details and testing steps

### Enhanced
- **Redis Client**: Improved error handling, validation, and atomic operations
- **Queue API**: Added Zod validation, rate limiting, and better error responses
- **LiveKit Token API**: Enhanced security with room name validation and rate limiting
- **E2EE Crypto**: Better input validation and error handling for all crypto functions
- **Client Components**: Improved error recovery and user experience
- **Topic Matching**: Enhanced scoring algorithm with tie-breaker logic
- **TTL Management**: Automatic cleanup of expired data (2min user meta, 10min matches)

### Fixed
- **TypeScript Errors**: Fixed Zod error handling in API routes
- **Race Conditions**: Atomic match creation prevents concurrent match issues
- **Memory Leaks**: Proper cleanup of polling intervals and sensitive data
- **Error Messages**: User-friendly error messages for all failure scenarios
- **Rate Limit Handling**: Graceful handling of rate limit responses

### Security
- **Input Validation**: All API endpoints validate inputs with Zod schemas
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Atomic Operations**: Redis transactions prevent race conditions
- **No PII Logging**: Telemetry system excludes all personally identifiable information
- **Key Security**: Enhanced validation for all cryptographic operations

### Performance
- **Queue Bounds**: Limited to 100 entries to prevent O(n²) operations
- **TTL Management**: Automatic cleanup reduces memory usage
- **Error Recovery**: Graceful handling of network errors
- **State Management**: Efficient client-side state machine

### Testing
- **Unit Tests**: Added comprehensive test coverage for crypto and queue operations
- **Integration Tests**: End-to-end testing of complete matching flow
- **Manual Testing**: Step-by-step testing guide for verification
- **Telemetry**: Anonymous metrics for monitoring and debugging

### Documentation
- **Implementation Details**: Added refined implementation section
- **Testing Guide**: Updated manual testing steps
- **Security Features**: Documented enhanced security measures
- **Troubleshooting**: Added comprehensive troubleshooting guide

## Previous Releases
- Initial E2EE 1v1 Random Voice Chat implementation
- LiveKit SFU integration with SFrame encryption
- Redis-backed stateless queue system
- Client-side X25519 key exchange
- Topic-based matching algorithm
