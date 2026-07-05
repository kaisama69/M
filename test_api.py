import urllib.request
import json

req = urllib.request.Request('http://127.0.0.1:5000/api/analyze', method='POST')
req.add_header('Content-Type', 'application/json')
data = json.dumps({'text': 'This is a test journal entry.'}).encode('utf-8')

try:
    with urllib.request.urlopen(req, data=data) as response:
        print("STATUS:", response.status)
        print("BODY:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code)
    print("BODY:", e.read().decode('utf-8'))
except Exception as e:
    print("ERROR:", e)
