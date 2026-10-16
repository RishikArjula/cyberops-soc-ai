/**
 * CyberOps SOC — Synthetic Network Evidence Consistency Test
 * Verifies foreign-key resolution, socket alignment, and chronological causality
 * between synthetic security alerts and CIC-IDS2017 network flow telemetry.
 */

import { INITIAL_SYNTHETIC_ALERTS } from '../data/syntheticAlerts';
import { SAMPLE_NETWORK_FLOWS } from '../data/networkFlows';
import { NetworkFlowRecord } from '../types/networkFlow';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`[FAIL] Test ${totalTests}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`[PASS] Test ${totalTests}: ${message}`);
}

export function runNetworkFlowConsistencyTests() {
  console.log('=== Starting Synthetic Network Flow Consistency Tests ===\n');

  // Test 1: Referential Integrity of Alert networkFlowIds
  const flowMap = new Map<string, NetworkFlowRecord>(
    SAMPLE_NETWORK_FLOWS.map((f) => [f.flowId, f])
  );

  const alertsWithFlowId = INITIAL_SYNTHETIC_ALERTS.filter((a) => a.networkFlowId);
  assert(
    alertsWithFlowId.length === 4,
    `Expected exactly 4 alerts with defined networkFlowId, found ${alertsWithFlowId.length}`
  );

  for (const alert of alertsWithFlowId) {
    const flow = flowMap.get(alert.networkFlowId!);
    assert(
      flow !== undefined,
      `Alert ${alert.id} references networkFlowId "${alert.networkFlowId}" which exists in SAMPLE_NETWORK_FLOWS`
    );
  }

  // Test 2: Host-only Alerts Without Flow References
  const alertsWithoutFlowId = INITIAL_SYNTHETIC_ALERTS.filter((a) => !a.networkFlowId);
  const unlinkedIds = alertsWithoutFlowId.map((a) => a.id).sort();
  assert(
    unlinkedIds.includes('ALT-2026-1046') && unlinkedIds.includes('ALT-2026-1044'),
    'Expected ALT-2026-1046 (host shadow copy deletion) and ALT-2026-1044 (intra-DC sync) to have no linked networkFlowId'
  );

  // Test 3: Corrected WMI Flow (FLOW-CIC-2017-0841 -> ALT-2026-1047)
  const wmiAlert = INITIAL_SYNTHETIC_ALERTS.find((a) => a.id === 'ALT-2026-1047')!;
  const wmiFlow = flowMap.get('FLOW-CIC-2017-0841')!;

  assert(
    wmiFlow.sourceIp === '192.168.10.14' && wmiFlow.sourceIp === wmiAlert.sourceIp,
    `WMI flow source IP (${wmiFlow.sourceIp}) matches alert source IP (192.168.10.14)`
  );
  assert(
    wmiFlow.destinationPort === 135 && wmiFlow.destinationPort === wmiAlert.evidence.remotePort,
    `WMI flow destination port (${wmiFlow.destinationPort}) matches alert evidence remotePort (135)`
  );
  assert(
    wmiFlow.destinationIp === '192.168.10.5' && wmiFlow.destinationIp === wmiAlert.destinationIp,
    `WMI flow destination IP (${wmiFlow.destinationIp}) matches PRIMARY-DC IP (192.168.10.5)`
  );
  assert(
    new Date(wmiFlow.timestamp).getTime() < new Date(wmiAlert.detectedAt).getTime(),
    `WMI flow timestamp (${wmiFlow.timestamp}) precedes alert detection (${wmiAlert.detectedAt})`
  );
  assert(
    wmiFlow.label === 'BENIGN',
    'WMI flow label preserved as "BENIGN" without fabricating unsupported benchmark classification'
  );

  // Test 4: Corrected PowerShell Download Cradle Flow (FLOW-CIC-2017-2104 -> ALT-2026-1048)
  const psAlert = INITIAL_SYNTHETIC_ALERTS.find((a) => a.id === 'ALT-2026-1048')!;
  const psFlow = flowMap.get('FLOW-CIC-2017-2104')!;

  assert(
    psFlow.timestamp === '2026-10-12T04:51:50Z',
    `PowerShell flow timestamp corrected to 2026-10-12T04:51:50Z (was inverted)`
  );
  assert(
    new Date(psFlow.timestamp).getTime() < new Date(psAlert.detectedAt).getTime(),
    `PowerShell flow timestamp precedes alert detection (${psAlert.detectedAt})`
  );
  assert(
    psFlow.sourceIp === psAlert.sourceIp &&
      psFlow.destinationIp === psAlert.evidence.remoteIp &&
      psFlow.destinationPort === psAlert.evidence.remotePort,
    'PowerShell flow socket strictly matches alert source, remote IP, and remotePort 443'
  );
  assert(
    psFlow.flowDurationMs === 60230,
    'PowerShell flow duration preserved at 60230 ms'
  );

  // Test 5: Corrected Slowloris DoS Flow (FLOW-CIC-2017-3391 -> ALT-2026-1045)
  const dosAlert = INITIAL_SYNTHETIC_ALERTS.find((a) => a.id === 'ALT-2026-1045')!;
  const dosFlow = flowMap.get('FLOW-CIC-2017-3391')!;

  assert(
    dosFlow.timestamp === '2026-10-12T02:08:45Z',
    `Slowloris flow timestamp corrected to 2026-10-12T02:08:45Z (was inverted by ~3 hours)`
  );
  assert(
    new Date(dosFlow.timestamp).getTime() < new Date(dosAlert.detectedAt).getTime(),
    `Slowloris flow timestamp precedes alert detection (${dosAlert.detectedAt})`
  );
  assert(
    dosFlow.sourceIp === dosAlert.sourceIp &&
      dosFlow.destinationIp === dosAlert.destinationIp &&
      dosFlow.destinationPort === dosAlert.evidence.remotePort,
    'Slowloris flow socket strictly matches alert source, destination IP, and destinationPort 80'
  );
  assert(
    dosFlow.flowDurationMs === 389000,
    'Slowloris flow duration preserved at 389000 ms'
  );

  // Test 6: Documented Unresolved LSASS / SSH-Patator Ambiguity (FLOW-CIC-2017-1092 -> ALT-2026-1049)
  const lsassAlert = INITIAL_SYNTHETIC_ALERTS.find((a) => a.id === 'ALT-2026-1049')!;
  const lsassFlow = flowMap.get('FLOW-CIC-2017-1092')!;

  assert(
    lsassFlow.sourceIp === lsassAlert.sourceIp &&
      lsassFlow.destinationIp === lsassAlert.destinationIp &&
      lsassFlow.destinationPort === 445,
    'LSASS flow endpoints verified on 192.168.10.14 -> 192.168.10.5:445 without arbitrary port mutation'
  );
  assert(
    lsassFlow.label === 'SSH-Patator',
    'LSASS flow label conserved as "SSH-Patator" (unresolved classification ambiguity documented)'
  );
  assert(
    new Date(lsassFlow.timestamp).getTime() < new Date(lsassAlert.detectedAt).getTime(),
    `LSASS flow timestamp (${lsassFlow.timestamp}) precedes alert detection (${lsassAlert.detectedAt})`
  );

  // Test 7: Total Flow Dataset Invariants
  assert(
    SAMPLE_NETWORK_FLOWS.length === 4,
    `SAMPLE_NETWORK_FLOWS length invariant preserved at exactly 4 records`
  );

  console.log(`\n=== COMPLETED: ${passedTests} of ${totalTests} NETWORK FLOW CONSISTENCY TESTS PASSED ===\n`);
}

// Execute standalone if run directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('networkFlowConsistencyTest')) {
  try {
    runNetworkFlowConsistencyTests();
  } catch (err) {
    console.error('Network flow consistency test suite failed:', err);
    process.exit(1);
  }
}
