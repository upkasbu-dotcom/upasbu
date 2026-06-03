#!/usr/bin/env python3
"""
Screenshot Service - port 3001
Endpoint:
  POST /screenshot      → screenshot tabel neraca daya → ImgBB URL
  POST /screenshot-hop  → screenshot tabel HOP BBM (H-1) → ImgBB URL
  GET  /health          → {"status":"ok"}
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json, urllib.request, urllib.parse, base64, time
from playwright.sync_api import sync_playwright

IMGBB_API_KEY = 'bb2f97ad9b31b5ae4967eeead61e03de'
PORT          = 3001


def upload_imgbb(path: str) -> str:
    """Upload file PNG ke ImgBB, return public URL."""
    with open(path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    data = urllib.parse.urlencode({'key': IMGBB_API_KEY, 'image': img_b64}).encode()
    req  = urllib.request.Request('https://api.imgbb.com/1/upload', data=data, method='POST')
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
    if not result.get('success'):
        raise Exception(f"ImgBB gagal: {result}")
    return result['data']['url']


def take_neraca_screenshot(tanggal: str) -> str:
    """Screenshot tabel neraca daya, upload ke ImgBB, return URL."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 2220, 'height': 800})
        page.goto('https://mesin-monitor.pages.dev/', wait_until='networkidle', timeout=30000)
        time.sleep(2)

        page.evaluate(f"document.querySelector('#data-tanggal').value = '{tanggal}'")
        page.evaluate("document.querySelector('#data-tanggal').dispatchEvent(new Event('change', {bubbles:true}))")
        time.sleep(4)

        page.evaluate("document.querySelector('#tab-btn-data').click()")
        time.sleep(1)
        page.evaluate("document.querySelector('#subtab-btn-neraca-daya').click()")
        time.sleep(1)

        # Paksa elemen visible
        page.evaluate("""
            (function() {
                ['#tab-data', '#neraca-table-wrap'].forEach(function(sel) {
                    var el = document.querySelector(sel);
                    if(el) {
                        el.style.setProperty('display', 'block', 'important');
                        el.style.setProperty('visibility', 'visible', 'important');
                        el.style.setProperty('opacity', '1', 'important');
                        el.style.setProperty('overflow', 'visible', 'important');
                    }
                });
            })()
        """)
        time.sleep(1)

        bb = page.evaluate("""
            (function() {
                var el = document.querySelector('#neraca-table');
                if(!el) return null;
                var r = el.getBoundingClientRect();
                return {x: r.x, y: r.y, width: el.scrollWidth, height: el.scrollHeight};
            })()
        """)

        page.screenshot(path='/tmp/neraca_auto.png', clip={
            'x': max(0, bb['x'] - 5),
            'y': max(0, bb['y'] - 5),
            'width':  bb['width'] + 10,
            'height': bb['height'] + 10
        })
        browser.close()

    return upload_imgbb('/tmp/neraca_auto.png')


def take_hop_bbm_screenshot(tanggal: str) -> str:
    """
    Screenshot tabel HOP BBM untuk tanggal tertentu (H-1).
    Crop kolom NO s/d ESTIMASI TIBA saja.
    Upload ke ImgBB, return URL.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 2400, 'height': 900})
        page.goto('https://mesin-monitor.pages.dev/', wait_until='networkidle', timeout=30000)
        time.sleep(2)

        # Set tanggal
        page.evaluate(f"document.querySelector('#data-tanggal').value = '{tanggal}'")
        page.evaluate("document.querySelector('#data-tanggal').dispatchEvent(new Event('change', {bubbles:true}))")
        time.sleep(3)

        # Klik tab DATA
        page.evaluate("document.querySelector('#tab-btn-data').click()")
        time.sleep(1)

        # Klik subtab HOP BBM
        page.evaluate("""
            (function() {
                var btns = document.querySelectorAll('[id^=subtab-btn]');
                for (var i = 0; i < btns.length; i++) {
                    if (btns[i].textContent.indexOf('HOP') !== -1 || btns[i].id.indexOf('hop') !== -1) {
                        btns[i].click(); return;
                    }
                }
                // fallback: coba ID langsung
                var btn = document.querySelector('#subtab-btn-hop-bbm') || document.querySelector('#subtab-btn-data');
                if (btn) btn.click();
            })()
        """)
        time.sleep(2)

        # Load data HOP BBM
        page.evaluate("""
            (function() {
                if (typeof loadDataTab === 'function') loadDataTab();
            })()
        """)
        time.sleep(4)

        # Paksa tabel visible
        page.evaluate("""
            (function() {
                ['#tab-data', '#data-table-wrap'].forEach(function(sel) {
                    var el = document.querySelector(sel);
                    if (el) {
                        el.style.setProperty('display', 'block', 'important');
                        el.style.setProperty('visibility', 'visible', 'important');
                        el.style.setProperty('opacity', '1', 'important');
                    }
                });
            })()
        """)
        time.sleep(1)

        # Ambil bounding box tabel data-table, crop sampai kolom ESTIMASI TIBA (header index 17)
        bb = page.evaluate("""
            (function() {
                var tbl = document.querySelector('#data-table');
                if (!tbl) return null;
                var headers = tbl.querySelectorAll('thead th');
                // Cari index kolom ESTIMASI TIBA
                var estIdx = -1;
                for (var i = 0; i < headers.length; i++) {
                    if (headers[i].textContent.indexOf('ESTIMASI TIBA') !== -1) {
                        estIdx = i; break;
                    }
                }
                if (estIdx < 0) estIdx = 17; // fallback

                // Hitung lebar sampai kolom estIdx
                var totalW = 0;
                for (var j = 0; j <= estIdx; j++) {
                    totalW += headers[j] ? headers[j].offsetWidth : 0;
                }

                var r = tbl.getBoundingClientRect();
                return {
                    x: r.x,
                    y: r.y,
                    width: totalW + 10,
                    height: tbl.scrollHeight + 10
                };
            })()
        """)

        if not bb:
            # Fallback: screenshot seluruh tabel
            bb_full = page.evaluate("""
                (function() {
                    var el = document.querySelector('#data-table-wrap') || document.querySelector('#data-table');
                    if (!el) return null;
                    var r = el.getBoundingClientRect();
                    return {x: r.x, y: r.y, width: el.scrollWidth, height: el.scrollHeight};
                })()
            """)
            bb = bb_full

        if not bb:
            raise Exception("Tabel HOP BBM tidak ditemukan di halaman")

        page.screenshot(path='/tmp/hop_bbm_auto.png', clip={
            'x': max(0, bb['x'] - 5),
            'y': max(0, bb['y'] - 5),
            'width':  min(bb['width'] + 10, 2400),
            'height': min(bb['height'] + 10, 900)
        })
        browser.close()

    return upload_imgbb('/tmp/hop_bbm_auto.png')


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[screenshot-service] {format % args}")

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        if self.path not in ('/screenshot', '/screenshot-hop'):
            self.send_response(404)
            self.end_headers()
            return

        length  = int(self.headers.get('Content-Length', 0))
        body    = self.rfile.read(length)
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        tanggal = payload.get('tanggal', '')
        if not tanggal:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': 'tanggal wajib diisi'}).encode())
            return

        try:
            if self.path == '/screenshot-hop':
                img_url = take_hop_bbm_screenshot(tanggal)
            else:
                img_url = take_neraca_screenshot(tanggal)

            resp_body = json.dumps({'success': True, 'url': img_url}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(resp_body)))
            self.end_headers()
            self.wfile.write(resp_body)
        except Exception as e:
            err = json.dumps({'success': False, 'error': str(e)}).encode()
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(err)


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    print(f"[screenshot-service] Listening on port {PORT}")
    server.serve_forever()
