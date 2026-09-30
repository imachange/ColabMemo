package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
)

var pageTemplate = template.Must(template.New("index").Parse(`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>GitHub App Manifest Builder</title>
  <style>
    body { font-family: sans-serif; margin: 20px; line-height: 1.5; }
    h1, h2 { margin-bottom: 8px; }
    section { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 160px 1fr auto; gap: 8px; align-items: center; }
    label { font-weight: bold; }
    input[type="text"], textarea { width: 100%; padding: 8px; font-family: inherit; }
    textarea { min-height: 320px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    button { padding: 8px 12px; cursor: pointer; }
    .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
    .hint { color: #555; font-size: 0.9rem; }
    #error { color: #b00020; margin-top: 8px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>GitHub App Manifest Builder</h1>
  <p class="hint">初期データ元: {{ .Source }}</p>

  <section>
    <h2>必要情報（表示・コピー用）</h2>
    <div class="grid">
      <label for="appId">App ID</label>
      <input id="appId" type="text" />
      <button data-copy-target="appId" type="button">コピー</button>

      <label for="clientId">Client ID</label>
      <input id="clientId" type="text" />
      <button data-copy-target="clientId" type="button">コピー</button>

      <label for="clientSecret">Client Secret</label>
      <input id="clientSecret" type="text" />
      <button data-copy-target="clientSecret" type="button">コピー</button>

      <label for="webhookSecret">Webhook Secret</label>
      <input id="webhookSecret" type="text" />
      <button data-copy-target="webhookSecret" type="button">コピー</button>

      <label for="privateKey">秘密鍵 (PEM)</label>
      <textarea id="privateKey" rows="5"></textarea>
      <button data-copy-target="privateKey" type="button">コピー</button>
    </div>
  </section>

  <section>
    <h2>Manifest 編集</h2>
    <textarea id="manifest"></textarea>
    <div class="actions">
      <label for="org">Organization (任意):</label>
      <input id="org" type="text" placeholder="organization-name" style="max-width: 320px;" />
      <button id="openManifest" type="button">Manifest ページを開く</button>
    </div>
    <div class="actions">
      <input id="manifestUrl" type="text" readonly />
      <button data-copy-target="manifestUrl" type="button">URLをコピー</button>
    </div>
    <div id="error"></div>
  </section>

  <script>
    const initial = {{ .InitialData }};

    function pickValue(obj, keys) {
      for (const key of keys) {
        if (obj && Object.prototype.hasOwnProperty.call(obj, key) && obj[key] != null && obj[key] !== "") {
          return obj[key];
        }
      }
      return "";
    }

    function str(v) {
      if (typeof v === "string") return v;
      if (v == null) return "";
      return String(v);
    }

    const credentials = initial.credentials && typeof initial.credentials === "object" ? initial.credentials : {};

    document.getElementById("appId").value = str(pickValue(initial, ["app_id", "id", "github_app_id"])) || str(pickValue(credentials, ["app_id", "id"]));
    document.getElementById("clientId").value = str(pickValue(initial, ["client_id"])) || str(pickValue(credentials, ["client_id"]));
    document.getElementById("clientSecret").value = str(pickValue(initial, ["client_secret"])) || str(pickValue(credentials, ["client_secret"]));
    document.getElementById("webhookSecret").value = str(pickValue(initial, ["webhook_secret"])) || str(pickValue(credentials, ["webhook_secret"]));
    document.getElementById("privateKey").value = str(pickValue(initial, ["private_key", "pem", "private_key_pem"])) || str(pickValue(credentials, ["private_key", "pem", "private_key_pem"]));

    const defaultManifest = initial.manifest && typeof initial.manifest === "object" ? initial.manifest : initial;
    document.getElementById("manifest").value = JSON.stringify(defaultManifest, null, 2);

    function buildManifestUrl() {
      const errorEl = document.getElementById("error");
      errorEl.textContent = "";
      let parsed;
      try {
        parsed = JSON.parse(document.getElementById("manifest").value);
      } catch (err) {
        errorEl.textContent = "Manifest JSONの形式が不正です:\n" + err;
        return null;
      }

      const encodedManifest = encodeURIComponent(JSON.stringify(parsed));
      const org = document.getElementById("org").value.trim();
      const base = org
        ? "https://github.com/organizations/" + encodeURIComponent(org) + "/settings/apps/new"
        : "https://github.com/settings/apps/new";

      const fullUrl = base + "?manifest=" + encodedManifest;
      document.getElementById("manifestUrl").value = fullUrl;
      return fullUrl;
    }

    document.getElementById("openManifest").addEventListener("click", () => {
      const fullUrl = buildManifestUrl();
      if (fullUrl) {
        window.open(fullUrl, "_blank", "noopener,noreferrer");
      }
    });

    for (const btn of document.querySelectorAll("button[data-copy-target]")) {
      btn.addEventListener("click", async () => {
        const targetId = btn.getAttribute("data-copy-target");
        const target = document.getElementById(targetId);
        if (!target) return;
        try {
          await navigator.clipboard.writeText(target.value || "");
          btn.textContent = "コピー済み";
          setTimeout(() => { btn.textContent = "コピー"; }, 1000);
        } catch {
          btn.textContent = "失敗";
          setTimeout(() => { btn.textContent = "コピー"; }, 1000);
        }
      });
    }

    buildManifestUrl();
  </script>
</body>
</html>`))

type pageData struct {
	Source      string
	InitialData template.JS
}

func main() {
	addr := flag.String("addr", ":8080", "HTTP listen address")
	flag.Usage = func() {
		fmt.Fprintf(flag.CommandLine.Output(), "Usage: %s [options] <json-path-or-url>\n", os.Args[0])
		flag.PrintDefaults()
	}
	flag.Parse()

	if flag.NArg() != 1 {
		flag.Usage()
		os.Exit(2)
	}

	source := flag.Arg(0)
	initial, err := readJSONSource(source)
	if err != nil {
		log.Fatalf("failed to read JSON source: %v", err)
	}

	jsonForPage, err := marshalForScript(initial)
	if err != nil {
		log.Fatalf("failed to marshal initial data: %v", err)
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if err := pageTemplate.Execute(w, pageData{Source: source, InitialData: template.JS(jsonForPage)}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})

	log.Printf("Open http://localhost%s", *addr)
	if err := http.ListenAndServe(*addr, nil); err != nil {
		log.Fatal(err)
	}
}

func readJSONSource(source string) (map[string]any, error) {
	var b []byte

	u, err := url.Parse(source)
	if err == nil && (u.Scheme == "http" || u.Scheme == "https") {
		b, err = readFromURL(source)
		if err != nil {
			return nil, err
		}
	} else {
		b, err = os.ReadFile(source)
		if err != nil {
			return nil, err
		}
	}

	trimmed := strings.TrimSpace(string(b))
	if trimmed == "" {
		return nil, errors.New("JSON is empty")
	}

	var out map[string]any
	if err := json.Unmarshal([]byte(trimmed), &out); err != nil {
		return nil, err
	}
	return out, nil
}

func readFromURL(rawURL string) ([]byte, error) {
	resp, err := http.Get(rawURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("non-2xx status: %s", resp.Status)
	}
	return io.ReadAll(resp.Body)
}

func marshalForScript(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	s := string(b)
	replacer := strings.NewReplacer(
		"<", "\\u003c",
		">", "\\u003e",
		"&", "\\u0026",
		"\u2028", "\\u2028",
		"\u2029", "\\u2029",
	)
	return replacer.Replace(s), nil
}
