# -*- coding: utf-8 -*-
"""Zkouska modulu sit.js: dva headless Chromy, host + kamarad, opravdove spojeni.

Spusteni: python zkouska.py
Vysledek: dva radky s titulkem stranky. Chceme spojeno=True a prijato > 0.
"""
import http.server, os, socketserver, subprocess, sys, threading, re, time

KOREN = os.path.dirname(os.path.abspath(__file__))
CHROME = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
PORT = 9911
KOD = "ZK7"


SEBRANO = []


class Tise(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=KOREN, **k)

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        SEBRANO.append(self.rfile.read(n).decode("utf-8", "replace"))
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, *a):
        pass


def server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Tise) as s:
        s.serve_forever()


def chrome(role, profil):
    """POZOR: zadne --dump-dom. To vypise stranku hned po nacteni a Chrome
    SKONCI, takze vysledek, ktery vznikne az za 15 vterin, nikdy nedorazi.
    Chrome proto necháme bezet a vysledek si od nej vezmeme pres POST."""
    url = "http://127.0.0.1:%d/ukazka.html?role=%s&kod=%s" % (PORT, role, KOD)
    return subprocess.Popen(
        [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
         "--user-data-dir=" + os.path.join(KOREN, "prof_" + profil),
         "--autoplay-policy=no-user-gesture-required", url],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == "__main__":
    threading.Thread(target=server, daemon=True).start()
    time.sleep(1)
    h = chrome("host", "h")
    time.sleep(2)
    k = chrome("klient", "k")
    # cekame, az oba posilaji vysledek (nebo do limitu)
    konec = time.time() + 80
    while time.time() < konec and len(SEBRANO) < 2:
        time.sleep(1)
    for p in (h, k):
        try:
            p.kill()
        except Exception:
            pass
    if not SEBRANO:
        print("NIC NEDORAZILO – spojeni se vubec nenavazalo")
    for radek in SEBRANO:
        print(radek)
