#!/usr/bin/env python3
"""Validate the embedded companion after building either a simulator app or an archive."""
import argparse
import plistlib
from pathlib import Path


def check(app: Path) -> None:
    phone = plistlib.loads((app / 'Info.plist').read_bytes())
    companions = list((app / 'Watch').glob('*.app'))
    assert len(companions) == 1, 'Expected exactly one embedded Watch app'
    watch = plistlib.loads((companions[0] / 'Info.plist').read_bytes())
    for key in ('CFBundleVersion', 'CFBundleShortVersionString'):
        assert phone.get(key) and phone[key] == watch.get(key), f'iPhone/Watch mismatch: {key}'
    assert watch.get('WKApplication') is True, 'Missing Watch application marker'
    assert watch.get('WKCompanionAppBundleIdentifier') == phone['CFBundleIdentifier'], 'Wrong companion bundle identifier'
    assert 'workout-processing' in watch.get('WKBackgroundModes', []), 'Missing workout background mode'
    print(f"iPhone + Watch: {phone['CFBundleShortVersionString']} ({phone['CFBundleVersion']}), packaging OK")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('app', type=Path, help='Path to the built iPhone .app containing Watch/*.app')
    check(parser.parse_args().app)
