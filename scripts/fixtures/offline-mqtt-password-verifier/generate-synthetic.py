"""Independent Python/OpenSSL reference. PUBLIC SYNTHETIC data only; no real auth input."""
import base64
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
cases = [
    ('ascii', 'SYNTHETIC_ascii_123!', 1000, 12),
    ('unicode', 'SYNTHETIC_Tiếng Việt_🌱', 4096, 64),
    ('spaces', '  SYNTHETIC with spaces  ', 2, 12),
    ('special', 'SYNTHETIC_\'"\\/$![]', 1, 64),
    ('composed', 'SYNTHETIC_é', 1000, 12),
]
manifest = {'reference': 'Python hashlib.pbkdf2_hmac sha512, Mosquitto 2.1.2 canonical $7$', 'syntheticOnly': True, 'fixtures': []}
for name, password, iterations, salt_len in cases:
    salt = bytes(range(salt_len))
    digest = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt, iterations, dklen=64)
    encoded = '$7$%d$%s$%s' % (iterations, base64.b64encode(salt).decode('ascii'), base64.b64encode(digest).decode('ascii'))
    data = ('smartagri_backend:' + encoded + '\n').encode('ascii')
    target = root / ('synthetic-' + name + '.pw')
    with target.open('xb') as f:
        f.write(data)
    manifest['fixtures'].append({'name': name, 'file': target.name, 'iterations': iterations, 'saltBytes': salt_len, 'digestBytes': 64, 'sha256': hashlib.sha256(data).hexdigest()})
with (root / 'synthetic-manifest.json').open('x', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)
print(json.dumps({'syntheticFixturesCreated': len(cases), 'realCredentialsRead': False}))
