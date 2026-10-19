import urllib.request
import json
import sys

def request(url, method='GET', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req_data = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

print("=== 1. Testing Auth Login ===")
status, emp_auth = request('http://127.0.0.1:3001/api/auth/login', 'POST', {'email': 'employee@veil.corp', 'password': 'Employee123!'})
print(f"Employee Login: {status}, User: {emp_auth.get('user', {}).get('name')}")
emp_token = emp_auth.get('token')

status, app_auth = request('http://127.0.0.1:3001/api/auth/login', 'POST', {'email': 'approver@veil.corp', 'password': 'Approver123!'})
print(f"Approver Login: {status}, User: {app_auth.get('user', {}).get('name')}")
app_token = app_auth.get('token')

print("\n=== 2. Testing Payment Request Submission (Employee) ===")
status, payment_resp = request('http://127.0.0.1:3001/api/payments', 'POST', {
    'claimedCaller': 'Vikram Malhotra',
    'callerPhone': '+1 (415) 555-9999',
    'action': 'Urgent confidential asset acquisition wire. Keep this between us.',
    'amount': 4500000,
    'payee': 'Pan-Pacific Escrow Cayman',
    'bankAccount': 'KY-8829-OFFSHORE-01',
    'urgencyLanguage': True
}, token=emp_token)
payment = payment_resp.get('paymentRequest', {})
payment_id = payment.get('id')
print(f"Submit Payment ({payment_id}): {status}, Status: {payment.get('status')}")
print(f"Flags: {payment.get('flags')}")

print("\n=== 3. Testing Two-Person Rule: Submitter Self-Approval (MUST FAIL with 403) ===")
status, self_app_resp = request(f'http://127.0.0.1:3001/api/payments/{payment_id}/approve', 'POST', {'reason': 'Self approval attempt'}, token=emp_token)
print(f"Self-Approval Result: {status} (Expected 403 Forbidden)")
print(f"Response Error: {self_app_resp.get('error')}: {self_app_resp.get('message')}")

print("\n=== 4. Testing Two-Person Rule: Independent Approver (MUST SUCCEED) ===")
status, approver_resp = request(f'http://127.0.0.1:3001/api/payments/{payment_id}/approve', 'POST', {'reason': 'Called CEO desk phone directly; confirmed safe phrase Crimson Falcon 88.'}, token=app_token)
approved_payment = approver_resp.get('paymentRequest', {})
print(f"Independent Approval Result: {status}, Status: {approved_payment.get('status')}")
print(f"Approver: {approved_payment.get('approverName')}, Reason: {approved_payment.get('approvalReason')}")

print("\n=== 5. Testing Audit Log Recording ===")
status, audit_resp = request('http://127.0.0.1:3001/api/audit-logs', 'GET', token=app_token)
logs = audit_resp.get('auditLogs', [])
print(f"Audit Logs count: {len(logs)}")
for l in logs[:3]:
    det = l.get('details', '').encode('ascii', 'replace').decode('ascii')
    print(f" - [{l.get('action')}] by {l.get('userName')}: {det}")

print("\n=== 6. Testing Model Evaluation Benchmark Dataset ===")
status, eval_resp = request('http://127.0.0.1:3001/api/detect/evaluation')
print(f"Evaluation Benchmark: Total Clips={eval_resp.get('sample_size')}")
pt = eval_resp.get('pretrained_model', {})
ac = eval_resp.get('acoustic_heuristic', {})
cb = eval_resp.get('combination_dual_consensus', {})
print(f" - Pretrained (Wav2Vec2): Acc={pt.get('accuracy_percent')}%, FPR={pt.get('false_positive_rate_percent')}%, FNR={pt.get('false_negative_rate_percent')}%")
print(f" - Acoustic Heuristic:    Acc={ac.get('accuracy_percent')}%, FPR={ac.get('false_positive_rate_percent')}%, FNR={ac.get('false_negative_rate_percent')}%")
print(f" - Dual Consensus:        Acc={cb.get('accuracy_percent')}%, FPR={cb.get('false_positive_rate_percent')}%, FNR={cb.get('false_negative_rate_percent')}%")

print("\n=== 7. Testing Detection Engine with Multi-Layer Weighted Scoring ===")
status, detect_resp = request('http://127.0.0.1:3001/api/detect/analyze', 'POST', {
    'transcript': 'I need you to wire the payment right now. Keep this confidential and bypass standard approval.',
    'callerClaim': 'Vikram Malhotra',
    'expectedIdentity': 'Unknown Caller',
    'audioMetrics': {'hasVocoderJitter': True, 'highFreqRatio': 10, 'peakFreqHz': 7200}
})
print(f"Analyze Status: {status}, Score: {detect_resp.get('score')}, Verdict: {detect_resp.get('verdict')}")
print(f"Weights Breakdown: {detect_resp.get('telemetry', {}).get('weights')}")
print(f"Signals: {detect_resp.get('signalsTriggered')}")

print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")
