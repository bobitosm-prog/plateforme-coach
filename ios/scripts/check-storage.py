#!/usr/bin/env python3
"""Run the synthetic WebKit persistence probe on one existing iOS simulator."""
import argparse
import json
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = 'ch.moovx.storageprobe'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--device', required=True, help='Existing iOS simulator UUID')
args = parser.parse_args()
output = ROOT / 'ios' / 'DerivedData' / 'storage-qa'
output.mkdir(parents=True, exist_ok=True)


def run(*command, timeout=120):
    return subprocess.run(command, check=True, capture_output=True, text=True,
                          timeout=timeout).stdout.strip()


def sim(*command):
    return run('xcrun', 'simctl', *command)


def build(number):
    with (output / f'build-{number}.log').open('w') as log:
        subprocess.run([
            'xcodebuild', '-quiet', '-project',
            str(ROOT / 'ios/MoovXPrototype/MoovXPrototype.xcodeproj'),
            '-scheme', 'MoovXPrototype', '-configuration', 'Debug',
            '-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator',
            '-derivedDataPath', str(output / f'build-{number}'),
            f'PRODUCT_BUNDLE_IDENTIFIER={BUNDLE}',
            'SWIFT_ACTIVE_COMPILATION_CONDITIONS=STORAGE_PROBE',
            f'CURRENT_PROJECT_VERSION={number}', 'CODE_SIGNING_ALLOWED=NO', 'build',
        ], check=True, stdout=log, stderr=subprocess.STDOUT, timeout=240)
    return output / f'build-{number}/Build/Products/Debug-iphonesimulator/MoovXPrototype.app'


def launch_and_check(label, number, write=False):
    container = Path(sim('get_app_container', args.device, BUNDLE, 'data'))
    report = container / 'Documents/storage-probe-result.json'
    # Remove only the previous synthetic report, never the persisted fixture.
    report.unlink(missing_ok=True)
    sim('launch', args.device, BUNDLE, *(['--write'] if write else []))
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        if report.exists():
            data = json.loads(report.read_text())
            assert data.get('found') is True, f'{label}: fixture missing'
            assert data.get('completedSets') == 2, f'{label}: sets changed'
            assert data.get('mode') == ('write' if write else 'read'), f'{label}: wrong mode'
            assert data.get('build') == str(number), f'{label}: wrong build'
            results.append({'scenario': label, **data})
            print(f'PASS {label}: build {number}, 2 synthetic sets', flush=True)
            sim('terminate', args.device, BUNDLE)
            return
        time.sleep(0.5)
    raise TimeoutError(f'{label}: no fresh probe report after 45 seconds')


inventory = json.loads(sim('list', 'devices', 'available', '--json'))
devices = [d for group in inventory['devices'].values() for d in group]
device = next((d for d in devices if d['udid'] == args.device), None)
if device is None:
    raise SystemExit('Unknown or unavailable simulator; no device created.')
started_here = device['state'] != 'Booted'
results = []
try:
    first = build(601)
    second = build(602)
    if started_here:
        sim('boot', args.device)
    sim('bootstatus', args.device, '-b')
    sim('install', args.device, str(first))
    launch_and_check('initial-write', 601, write=True)
    launch_and_check('cold-relaunch', 601)
    sim('install', args.device, str(first))
    launch_and_check('reinstall-without-uninstall', 601)
    sim('install', args.device, str(second))
    launch_and_check('update-without-uninstall', 602)
finally:
    (output / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
    if started_here:
        sim('shutdown', args.device)
print(f'Results: {output / "results.json"}')
