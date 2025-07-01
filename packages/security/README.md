# Praxis Security

Enterprise-grade security features for Praxis applications.

## Installation

```bash
npm install @oxog/praxis-security
```

## Features

### Content Security Policy (CSP)

```javascript
import { createCSP } from '@oxog/praxis-security';

const csp = createCSP({
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https:"],
  reportUri: '/csp-report'
});

// Apply CSP
app.use(csp.middleware());
```

### XSS Protection

```javascript
import { sanitize, escapeHtml } from '@oxog/praxis-security';

// Sanitize HTML
const clean = sanitize(userInput);

// Escape HTML entities
const escaped = escapeHtml(userInput);
```

### Trusted Types

```javascript
import { enableTrustedTypes } from '@oxog/praxis-security';

// Enable Trusted Types API
enableTrustedTypes({
  createPolicy: true,
  defaultPolicy: 'praxis-default'
});
```

### Input Validation

```javascript
import { validate } from '@oxog/praxis-security';

const schema = {
  email: { type: 'email', required: true },
  age: { type: 'number', min: 18, max: 100 },
  username: { type: 'string', pattern: /^[a-zA-Z0-9_]+$/ }
};

const errors = validate(userInput, schema);
```

### CSRF Protection

```javascript
import { csrf } from '@oxog/praxis-security';

// Generate token
const token = csrf.generate();

// Verify token
const isValid = csrf.verify(token);
```

### Rate Limiting

```javascript
import { rateLimit } from '@oxog/praxis-security';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests'
});
```

### Secure Headers

```javascript
import { secureHeaders } from '@oxog/praxis-security';

app.use(secureHeaders({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: 'strict-origin-when-cross-origin'
}));
```

## Configuration

```javascript
import { configureSecurity } from '@oxog/praxis-security';

configureSecurity({
  // Global settings
  enableCSP: true,
  enableTrustedTypes: true,
  enableSanitization: true,
  
  // CSP settings
  csp: {
    reportOnly: false,
    directives: {
      defaultSrc: ["'self'"]
    }
  },
  
  // Sanitization settings
  sanitizer: {
    allowedTags: ['b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: {
      'a': ['href']
    }
  }
});
```

## Best Practices

1. **Always sanitize user input** before rendering
2. **Use CSP headers** to prevent XSS attacks
3. **Enable Trusted Types** for DOM manipulation
4. **Validate all inputs** on both client and server
5. **Implement rate limiting** for API endpoints
6. **Use secure headers** for all responses

## Security Checklist

- [ ] CSP headers configured
- [ ] Input sanitization enabled
- [ ] Trusted Types enabled
- [ ] CSRF protection active
- [ ] Rate limiting configured
- [ ] Secure headers set
- [ ] HTTPS enforced
- [ ] Sensitive data encrypted

## License

MIT