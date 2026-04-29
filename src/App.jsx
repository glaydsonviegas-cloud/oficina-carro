import { useState, useEffect, useCallback, useRef } from "react";

// ─── BANCO DE DADOS (localStorage) ───────────────────────────────────────────
const db = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } },
  getOne: (k) => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {
    if (e.name === "QuotaExceededError") alert("⚠️ Armazenamento cheio! Faça backup e limpe alguns dados.");
  }},
};

// ─── COMPRESSÃO DE IMAGEM ─────────────────────────────────────────────────────
const compressImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 960;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = reject;
    img.src = e.target.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const fmt = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hoje = () => new Date().toISOString().slice(0, 10);
const fmtData = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—";

const hashSenha = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h.toString(16);
};

const inicializarAdmin = () => {
  const us = db.get("usuarios");
  if (!us.find(u => u.role === "admin")) {
    db.set("usuarios", [...us, {
      id: "admin-master", nome: "Administrador",
      login: "admin", senha: hashSenha("admin123"),
      role: "admin", criadoEm: hoje(),
    }]);
  }
};

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0f1923", card: "#162032", border: "#1e3048",
  accent: "#f97316", accentDark: "#c2510d",
  text: "#e8edf2", muted: "#6b8099",
  green: "#22c55e", red: "#ef4444", blue: "#3b82f6",
  gold: "#f59e0b", purple: "#a855f7",
};

const NAV_H = 64;

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 16, ...style }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, color = C.accent, style, disabled, small }) => {
  const [pressed, setPressed] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        background: disabled ? C.border : color, color: disabled ? C.muted : "#fff",
        borderRadius: 12, padding: small ? "8px 14px" : "13px 20px",
        fontWeight: 700, fontSize: small ? 13 : 15,
        transform: pressed && !disabled ? "scale(0.95)" : "scale(1)",
        transition: "transform .1s, opacity .15s",
        opacity: disabled ? .6 : 1, minHeight: small ? 36 : 48, ...style,
      }}>{children}
    </button>
  );
};

const Lbl = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>
    {children}
  </div>
);

const Field = ({ label, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <Lbl>{label}</Lbl>}
    <input {...props} />
  </div>
);

const Row = ({ children, gap = 10, style }) => (
  <div style={{ display: "flex", gap, flexWrap: "wrap", ...style }}>{children}</div>
);

const Badge = ({ children, color = C.accent }) => (
  <span style={{ background: color + "22", color, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
    {children}
  </span>
);

const TopBar = ({ title, onBack, right }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 16px", background: C.card,
    borderBottom: `1px solid ${C.border}`,
    position: "sticky", top: 0, zIndex: 50,
  }}>
    {onBack && (
      <button onClick={onBack} style={{
        background: C.border, borderRadius: 10, color: C.text,
        width: 44, height: 44, fontSize: 20, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>‹</button>
    )}
    <div style={{ fontWeight: 900, fontSize: 18, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
    {right}
  </div>
);

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({ screen, navigate, isAdmin }) {
  const items = [
    { id: "menu",     icon: "🏠",  label: "Início"    },
    { id: "clientes", icon: "👥",  label: "Clientes"  },
    { id: "orcamento",icon: "📋",  label: "Orçamento" },
    { id: "vendas",   icon: "💰",  label: "Vendas"    },
    ...(isAdmin ? [{ id: "config", icon: "⚙️", label: "Config" }] : []),
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: NAV_H, background: C.card, borderTop: `1px solid ${C.border}`,
      display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom,0)",
    }}>
      {items.map(item => {
        const active = screen === item.id;
        return (
          <button key={item.id} onClick={() => navigate(item.id)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, background: "transparent",
            color: active ? C.accent : C.muted,
            borderTop: active ? `2px solid ${C.accent}` : "2px solid transparent",
          }}>
            <div style={{ fontSize: 20 }}>{item.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700 }}>{item.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── CHECKLIST ────────────────────────────────────────────────────────────────
const CK_ITEMS = [
  { id: "pneu_dd", label: "Pneu Diant. Dir." },
  { id: "pneu_de", label: "Pneu Diant. Esq." },
  { id: "pneu_td", label: "Pneu Tras. Dir."  },
  { id: "pneu_te", label: "Pneu Tras. Esq."  },
  { id: "estepe",  label: "Estepe"            },
  { id: "freio_d", label: "Freios Diant."     },
  { id: "freio_t", label: "Freios Tras."      },
  { id: "oleo",    label: "Nível de Óleo"     },
  { id: "agua",    label: "Nível d'Água"      },
  { id: "arrefec", label: "Arrefecimento"     },
  { id: "bateria", label: "Bateria"           },
  { id: "lataria", label: "Lataria/Funilaria" },
  { id: "vidros",  label: "Vidros"            },
  { id: "espelhos",label: "Retrovisores"      },
  { id: "farois",  label: "Faróis/Lanternas"  },
  { id: "luzes",   label: "Luzes Painel"      },
  { id: "ar",      label: "Ar-Condicionado"   },
  { id: "docs",    label: "Documentação"      },
  { id: "tapetes", label: "Interior/Tapetes"  },
  { id: "cinto",   label: "Cintos Segurança"  },
];

const CK_ESTADOS = ["", "ok", "atencao", "problema"];
const CK_LABELS  = { "": "—", ok: "✅ OK", atencao: "⚠️ Atenção", problema: "❌ Problema" };
const CK_CORES   = { "": C.muted, ok: C.green, atencao: C.gold, problema: C.red };

function Checklist({ checklist = {}, onChange }) {
  const toggle = (id) => {
    const cur = checklist[id] || "";
    const next = CK_ESTADOS[(CK_ESTADOS.indexOf(cur) + 1) % CK_ESTADOS.length];
    onChange({ ...checklist, [id]: next });
  };
  return (
    <div>
      <Lbl>🔍 Checklist de Entrada — Toque para alternar</Lbl>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {CK_ITEMS.map(item => {
          const st = checklist[item.id] || "";
          return (
            <button key={item.id} onClick={() => toggle(item.id)} style={{
              background: C.bg, border: `1.5px solid ${CK_CORES[st]}44`,
              borderRadius: 10, padding: "8px 10px", textAlign: "left", color: C.text,
            }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: CK_CORES[st] }}>{CK_LABELS[st]}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── FOTO UPLOAD ──────────────────────────────────────────────────────────────
function FotoUpload({ fotos = [], onChange, readOnly }) {
  const MAX = 5;
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = MAX - fotos.length;
    const toProcess = files.slice(0, remaining);
    setLoading(true);
    try {
      const compressed = await Promise.all(toProcess.map(compressImage));
      onChange([...fotos, ...compressed]);
    } catch { alert("Erro ao processar imagem."); }
    setLoading(false);
    e.target.value = "";
  };

  const remover = (idx) => {
    if (readOnly) return;
    if (!confirm("Remover esta foto?")) return;
    onChange(fotos.filter((_, i) => i !== idx));
  };

  const [fotoGrande, setFotoGrande] = useState(null);

  return (
    <div>
      <Lbl>📸 Fotos do Veículo ({fotos.length}/{MAX})</Lbl>

      {/* Lightbox */}
      {fotoGrande !== null && (
        <div onClick={() => setFotoGrande(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.92)",
          zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <img src={fotos[fotoGrande]} style={{ maxWidth: "95vw", maxHeight: "90vh", borderRadius: 12 }} />
          <div style={{ position: "absolute", top: 16, right: 16, background: C.card, borderRadius: 50, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: C.text }}>×</div>
          <div style={{ position: "absolute", bottom: 20, color: C.muted, fontSize: 13, fontWeight: 700 }}>Foto {fotoGrande + 1} de {fotos.length} — Toque para fechar</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {fotos.map((foto, i) => (
          <div key={i} style={{ position: "relative", aspectRatio: "4/3" }}>
            <img src={foto} alt={`Foto ${i + 1}`} onClick={() => setFotoGrande(i)}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10, border: `1px solid ${C.border}`, cursor: "pointer" }} />
            {!readOnly && (
              <button onClick={() => remover(i)} style={{
                position: "absolute", top: 4, right: 4, background: C.red,
                color: "#fff", borderRadius: "50%", width: 24, height: 24,
                fontSize: 14, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
            )}
            <div style={{
              position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,.7)",
              color: "#fff", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700,
            }}>#{i + 1}</div>
          </div>
        ))}

        {!readOnly && fotos.length < MAX && (
          <label style={{
            aspectRatio: "4/3", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            border: `2px dashed ${loading ? C.accent : C.border}`,
            borderRadius: 10, cursor: "pointer", gap: 4, color: loading ? C.accent : C.muted,
            background: C.bg, transition: "border-color .2s",
          }}>
            <div style={{ fontSize: 28 }}>{loading ? "⏳" : "📷"}</div>
            <div style={{ fontSize: 10, fontWeight: 700 }}>{loading ? "Processando..." : "Câmera/Galeria"}</div>
            <input type="file" accept="image/*" capture="environment"
              multiple onChange={handleFile} disabled={loading} style={{ display: "none" }} />
          </label>
        )}
      </div>

      {!readOnly && fotos.length < MAX && (
        <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
          Até {MAX} fotos • Imagens são comprimidas automaticamente
        </div>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const empresa = db.getOne("empresa");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [ver, setVer] = useState(false);

  const entrar = () => {
    if (!login.trim() || !senha.trim()) { setErro("Preencha usuário e senha."); return; }
    const user = db.get("usuarios").find(u => u.login === login.trim() && u.senha === hashSenha(senha));
    if (!user) { setErro("Usuário ou senha incorretos."); return; }
    setErro(""); onLogin(user);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 20,
      background: `radial-gradient(ellipse at top, #1a2d42 0%, ${C.bg} 70%)`,
    }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 72, marginBottom: 8 }}>🔧</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: C.accent }}>
          {empresa.nome || "Oficina Auto"}
        </div>
        {empresa.ramo && <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{empresa.ramo}</div>}
      </div>

      <div style={{
        background: C.card, borderRadius: 20, border: `1px solid ${C.border}`,
        padding: 28, width: "100%", maxWidth: 360,
        boxShadow: "0 24px 64px rgba(0,0,0,.5)",
      }}>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>Bem-vindo! 👋</div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Faça login para continuar</div>

        <Field label="Usuário" value={login}
          onChange={e => setLogin(e.target.value)}
          onKeyDown={e => e.key === "Enter" && entrar()}
          placeholder="Seu usuário" autoComplete="username" />

        <div style={{ marginBottom: 16 }}>
          <Lbl>Senha</Lbl>
          <div style={{ position: "relative" }}>
            <input type={ver ? "text" : "password"} value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === "Enter" && entrar()}
              placeholder="Sua senha" autoComplete="current-password"
              style={{ paddingRight: 48 }} />
            <button onClick={() => setVer(!ver)} style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "transparent", color: C.muted, fontSize: 18, padding: 0,
            }}>{ver ? "🙈" : "👁️"}</button>
          </div>
        </div>

        {erro && (
          <div style={{ background: C.red + "22", border: `1px solid ${C.red}`, borderRadius: 10, padding: "10px 14px", color: C.red, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
            ⚠️ {erro}
          </div>
        )}

        <Btn onClick={entrar} style={{ width: "100%", fontSize: 16 }}>🔑 Entrar</Btn>
      </div>

      <div style={{ color: C.muted + "66", fontSize: 11, marginTop: 20 }}>v2.0 • Oficina Auto</div>
    </div>
  );
}

// ─── HOME / MENU ─────────────────────────────────────────────────────────────
function HomeScreen({ navigate, usuario, onLogout }) {
  const empresa = db.getOne("empresa");
  const stats = {
    clientes:   db.get("clientes").length,
    orcamentos: db.get("orcamentos").length,
    vendas:     db.get("vendas").length,
    produtos:   db.get("produtos").length,
  };

  return (
    <div style={{ paddingBottom: NAV_H + 16 }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDark} 100%)`,
        padding: "20px 20px 28px",
        paddingTop: "max(env(safe-area-inset-top,0px),20px)",
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", fontWeight: 800, marginBottom: 2 }}>BEM-VINDO,</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>
              {usuario.nome} {usuario.role === "admin" ? "👑" : ""}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", marginTop: 2 }}>
              {empresa.nome || "Minha Oficina"}
            </div>
          </div>
          <button onClick={onLogout} style={{
            background: "rgba(0,0,0,.25)", borderRadius: 12,
            color: "#fff", padding: "8px 14px", fontSize: 13, fontWeight: 700,
          }}>Sair 🚪</button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {[
            { label: "Clientes",   val: stats.clientes,   icon: "👥" },
            { label: "Orçamentos", val: stats.orcamentos, icon: "📋" },
            { label: "Vendas",     val: stats.vendas,     icon: "💰" },
            { label: "Produtos",   val: stats.produtos,   icon: "🔧" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(0,0,0,.25)", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{s.val}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.7)", fontWeight: 700 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 16px" }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 }}>Ações Rápidas</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {[
            { id: "orcamento", label: "Novo Orçamento", icon: "📋", color: C.accent, desc: "Criar orçamento" },
            { id: "clientes",  label: "Clientes",       icon: "👥", color: C.blue,   desc: "Gerenciar clientes" },
            { id: "produtos",  label: "Produtos",       icon: "🔧", color: C.green,  desc: "Peças e serviços" },
            { id: "vendas",    label: "Vendas",         icon: "💰", color: C.gold,   desc: "Histórico" },
          ].map(m => (
            <button key={m.id} onClick={() => navigate(m.id)} style={{
              background: C.card, border: `1.5px solid ${C.border}`,
              borderRadius: 16, padding: "18px 14px",
              display: "flex", flexDirection: "column", alignItems: "flex-start",
              gap: 6, color: C.text, textAlign: "left", minHeight: 90,
            }}>
              <div style={{ fontSize: 28 }}>{m.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{m.label}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        {usuario.role === "admin" && (
          <button onClick={() => navigate("config")} style={{
            background: C.card, border: `1.5px solid ${C.border}`,
            borderRadius: 16, padding: "16px 20px", width: "100%",
            display: "flex", alignItems: "center", gap: 14, color: C.text,
          }}>
            <div style={{ fontSize: 26 }}>⚙️</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 800 }}>Configurações</div>
              <div style={{ color: C.muted, fontSize: 12 }}>Empresa, usuários e backup</div>
            </div>
            <div style={{ marginLeft: "auto", color: C.muted, fontSize: 20 }}>›</div>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── CLIENTES ────────────────────────────────────────────────────────────────
const FORM_VAZIO = {
  nome: "", telefone: "", email: "", cpf: "",
  marca: "", modelo: "", ano: "", cor: "", placa: "", km: "",
  checklist: {}, obs: "",
};

function ClientesScreen() {
  const [clientes, setClientes] = useState(() => db.get("clientes"));
  const [busca, setBusca]       = useState("");
  const [view, setView]         = useState("lista"); // lista | form | detalhe
  const [clienteAtual, setCa]   = useState(null);
  const [form, setForm]         = useState(FORM_VAZIO);
  const [msg, setMsg]           = useState("");
  const [ckAberto, setCkAberto] = useState(false);

  const novoForm = () => { setForm(FORM_VAZIO); setCa(null); setView("form"); };
  const editarC  = c => { setForm({ ...FORM_VAZIO, ...c, fotos: c.fotos || [], checklist: c.checklist || {} }); setCa(c); setView("form"); };
  const verD     = c => { setCa(c); setView("detalhe"); };

  const salvar = () => {
    if (!form.nome.trim()) { alert("Informe o nome."); return; }
    const all = db.get("clientes");
    const upd = clienteAtual
      ? all.map(c => c.id === clienteAtual.id ? { ...c, ...form } : c)
      : [...all, { ...form, id: uid(), criadoEm: hoje() }];
    db.set("clientes", upd); setClientes(upd);
    setMsg("✅ Cliente salvo!"); setTimeout(() => setMsg(""), 2500);
    setView("lista");
  };

  const excluir = id => {
    if (!confirm("Excluir este cliente?")) return;
    const u = db.get("clientes").filter(c => c.id !== id);
    db.set("clientes", u); setClientes(u); setView("lista");
  };

  const filtrados = clientes.filter(c =>
    [c.nome, c.telefone, c.placa, c.modelo, c.marca].some(v => v?.toLowerCase().includes(busca.toLowerCase()))
  );

  // ── DETALHE ──────────────────────────────────────────────────────────────
  if (view === "detalhe" && clienteAtual) {
    const c = clienteAtual;
    const ckOk  = CK_ITEMS.filter(i => c.checklist?.[i.id] === "ok").length;
    const ckAte = CK_ITEMS.filter(i => c.checklist?.[i.id] === "atencao").length;
    const ckProb= CK_ITEMS.filter(i => c.checklist?.[i.id] === "problema").length;

    return (
      <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: NAV_H + 16 }}>
        <TopBar title="👤 Ficha do Cliente" onBack={() => setView("lista")}
          right={<Btn small onClick={() => editarC(c)} color={C.blue}>✏️ Editar</Btn>} />
        <div style={{ padding: 16 }}>

          {/* Dados pessoais */}
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>{c.nome}</div>
            {c.telefone && (
              <a href={`tel:${c.telefone}`} style={{ color: C.green, display: "block", marginTop: 6, fontWeight: 700, textDecoration: "none" }}>
                📱 {c.telefone}
              </a>
            )}
            {c.telefone && (
              <a href={`https://wa.me/55${c.telefone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                style={{ color: C.green, display: "block", fontSize: 13, marginTop: 2, textDecoration: "none" }}>
                💬 Abrir WhatsApp
              </a>
            )}
            {c.email && <div style={{ color: C.muted, marginTop: 4 }}>📧 {c.email}</div>}
            {c.cpf && <div style={{ color: C.muted }}>🪪 CPF: {c.cpf}</div>}
            <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
              Cadastrado: {fmtData(c.criadoEm)}
            </div>
          </Card>

          {/* Veículo */}
          {(c.marca || c.modelo || c.placa) && (
            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>🚗 Dados do Veículo</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { l: "Marca",    v: c.marca  },
                  { l: "Modelo",   v: c.modelo },
                  { l: "Ano",      v: c.ano    },
                  { l: "Cor",      v: c.cor    },
                  { l: "Placa",    v: c.placa  },
                  { l: "KM",       v: c.km ? Number(c.km).toLocaleString("pt-BR") + " km" : "" },
                ].filter(x => x.v).map(x => (
                  <div key={x.l} style={{ background: C.bg, borderRadius: 10, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{x.l}</div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{x.v}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Resumo Checklist */}
          {c.checklist && Object.keys(c.checklist).filter(k => c.checklist[k]).length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>🔍 Checklist de Entrada</div>
              <Row gap={8} style={{ marginBottom: 12 }}>
                {ckOk   > 0 && <Badge color={C.green}>✅ {ckOk} OK</Badge>}
                {ckAte  > 0 && <Badge color={C.gold}>⚠️ {ckAte} Atenção</Badge>}
                {ckProb > 0 && <Badge color={C.red}>❌ {ckProb} Problema</Badge>}
              </Row>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {CK_ITEMS.filter(item => c.checklist[item.id]).map(item => {
                  const st = c.checklist[item.id];
                  return (
                    <div key={item.id} style={{ background: C.bg, borderRadius: 8, padding: "6px 10px" }}>
                      <div style={{ fontSize: 10, color: C.muted }}>{item.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: CK_CORES[st] }}>{CK_LABELS[st]}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Obs */}
          {c.obs && (
            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>📝 Observações</div>
              <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>{c.obs}</div>
            </Card>
          )}

          <Btn onClick={() => excluir(c.id)} color={C.red} style={{ width: "100%" }}>
            🗑️ Excluir Cliente
          </Btn>
        </div>
      </div>
    );
  }

  // ── FORMULÁRIO ────────────────────────────────────────────────────────────
  if (view === "form") {
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    return (
      <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: NAV_H + 20 }}>
        <TopBar
          title={clienteAtual ? "✏️ Editar Cliente" : "➕ Novo Cliente"}
          onBack={() => setView("lista")}
        />
        <div style={{ padding: 16 }}>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 14, color: C.accent }}>👤 Dados Pessoais</div>
            <Field label="Nome completo *" value={form.nome}
              onChange={e => set("nome", e.target.value)} placeholder="Ex: João Silva" />
            <Field label="Telefone / WhatsApp" value={form.telefone}
              onChange={e => set("telefone", e.target.value)} placeholder="(99) 99999-9999" type="tel" inputMode="tel" />
            <Field label="E-mail" value={form.email}
              onChange={e => set("email", e.target.value)} placeholder="email@exemplo.com" type="email" inputMode="email" />
            <Field label="CPF" value={form.cpf}
              onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 14, color: C.accent }}>🚗 Dados do Veículo</div>
            <Row>
              <div style={{ flex: 1, minWidth: 120 }}>
                <Field label="Marca" value={form.marca}
                  onChange={e => set("marca", e.target.value)} placeholder="Ex: Toyota" />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <Field label="Modelo" value={form.modelo}
                  onChange={e => set("modelo", e.target.value)} placeholder="Ex: Corolla" />
              </div>
            </Row>
            <Row>
              <div style={{ flex: 1, minWidth: 80 }}>
                <Field label="Ano" value={form.ano}
                  onChange={e => set("ano", e.target.value)} placeholder="2020" type="number" inputMode="numeric" />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <Field label="Cor" value={form.cor}
                  onChange={e => set("cor", e.target.value)} placeholder="Ex: Prata" />
              </div>
            </Row>
            <Row>
              <div style={{ flex: 1, minWidth: 100 }}>
                <Field label="Placa" value={form.placa}
                  onChange={e => set("placa", e.target.value.toUpperCase())} placeholder="ABC-1234" />
              </div>
              <div style={{ flex: 1, minWidth: 80 }}>
                <Field label="KM Atual" value={form.km}
                  onChange={e => set("km", e.target.value)} placeholder="50000" type="number" inputMode="numeric" />
              </div>
            </Row>
          </Card>

          <Card style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
            <button onClick={() => setCkAberto(!ckAberto)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "transparent", color: C.text, padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 20 }}>🔍</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, textAlign: "left" }}>Checklist de Entrada</div>
                  <div style={{ fontSize: 12, color: C.muted, textAlign: "left", marginTop: 1 }}>
                    {Object.values(form.checklist).filter(Boolean).length > 0
                      ? `${Object.values(form.checklist).filter(v => v === "ok").length} OK · ${Object.values(form.checklist).filter(v => v === "atencao").length} Atenção · ${Object.values(form.checklist).filter(v => v === "problema").length} Problema`
                      : "Toque para preencher o checklist"}
                  </div>
                </div>
              </div>
              <div style={{
                background: ckAberto ? C.accent : C.border,
                borderRadius: 8, width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, flexShrink: 0,
                transition: "background .2s, transform .25s",
                transform: ckAberto ? "rotate(180deg)" : "rotate(0deg)",
              }}>▼</div>
            </button>
            {ckAberto && (
              <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ height: 12 }} />
                <Checklist checklist={form.checklist} onChange={ck => set("checklist", ck)} />
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Lbl>📝 Observações</Lbl>
            <textarea value={form.obs} onChange={e => set("obs", e.target.value)}
              placeholder="Observações gerais sobre o cliente ou veículo..." rows={3}
              style={{ width: "100%", resize: "vertical" }} />
          </Card>

          <Btn onClick={salvar} style={{ width: "100%", fontSize: 16, marginBottom: 8 }}>
            💾 Salvar Cliente
          </Btn>
          {msg && <div style={{ color: C.green, fontWeight: 700, textAlign: "center", marginTop: 8 }}>{msg}</div>}
        </div>
      </div>
    );
  }

  // ── LISTA ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: NAV_H + 16 }}>
      <TopBar title="👥 Clientes" right={
        <Btn small onClick={novoForm} color={C.accent}>+ Novo</Btn>
      } />
      <div style={{ padding: "12px 16px" }}>
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar por nome, placa, modelo..." style={{ marginBottom: 12 }} />

        {filtrados.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <div>{busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</div>
            {!busca && (
              <div style={{ marginTop: 16 }}>
                <Btn onClick={novoForm}>+ Cadastrar 1º cliente</Btn>
              </div>
            )}
          </div>
        )}

        {filtrados.map(c => (
          <div key={c.id} onClick={() => verD(c)} style={{
            background: C.card, borderRadius: 14, padding: "14px 16px",
            marginBottom: 10, border: `1px solid ${C.border}`,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: C.accent + "22",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>🚗</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{c.nome}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                {[c.marca, c.modelo, c.placa].filter(Boolean).join(" • ")}
              </div>
              {c.telefone && <div style={{ color: C.muted, fontSize: 12 }}>📱 {c.telefone}</div>}
            </div>
            <div style={{ color: C.muted, fontSize: 20 }}>›</div>
          </div>
        ))}

        <div style={{ color: C.muted, fontSize: 12, textAlign: "center", marginTop: 8 }}>
          {filtrados.length} cliente{filtrados.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

// ─── PRODUTOS ─────────────────────────────────────────────────────────────────
function ProdutosScreen() {
  const [produtos, setProdutos] = useState(() => db.get("produtos"));
  const [form, setForm]         = useState({ nome: "", valor: "", tipo: "peca", descricao: "", estoque: "" });
  const [editId, setEditId]     = useState(null);
  const [busca, setBusca]       = useState("");
  const [aba, setAba]           = useState("pecas");
  const [msg, setMsg]           = useState("");

  const tipo = aba === "servicos" ? "servico" : "peca";

  const salvar = () => {
    if (!form.nome.trim()) { alert("Informe o nome."); return; }
    const all = db.get("produtos");
    const upd = editId
      ? all.map(p => p.id === editId ? { ...p, ...form, tipo } : p)
      : [...all, { ...form, tipo, id: uid(), criadoEm: hoje() }];
    db.set("produtos", upd); setProdutos(upd);
    setForm({ nome: "", valor: "", tipo, descricao: "", estoque: "" });
    setEditId(null);
    setMsg("✅ Salvo!"); setTimeout(() => setMsg(""), 2000);
  };

  const excluir = id => {
    if (!confirm("Excluir?")) return;
    const u = db.get("produtos").filter(p => p.id !== id);
    db.set("produtos", u); setProdutos(u);
  };

  const editar = p => {
    setForm({ nome: p.nome, valor: p.valor, tipo: p.tipo, descricao: p.descricao || "", estoque: p.estoque || "" });
    setEditId(p.id); window.scrollTo(0, 0);
  };

  const filtrados = produtos.filter(p =>
    p.tipo === tipo &&
    [p.nome, p.descricao].some(v => v?.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: NAV_H + 16 }}>
      <TopBar title="🔧 Produtos & Serviços" />

      {/* Abas */}
      <div style={{ display: "flex", background: C.card, borderBottom: `1px solid ${C.border}` }}>
        {[["pecas", "🔩 Peças"], ["servicos", "🛠️ Serviços"]].map(([id, label]) => (
          <button key={id} onClick={() => { setAba(id); setEditId(null); setForm({ nome: "", valor: "", tipo: id === "servicos" ? "servico" : "peca", descricao: "", estoque: "" }); }}
            style={{
              flex: 1, padding: "13px 0", fontWeight: 700, fontSize: 14,
              background: "transparent", color: aba === id ? C.accent : C.muted,
              borderBottom: aba === id ? `2px solid ${C.accent}` : "2px solid transparent",
            }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>
            {editId ? "✏️ Editar" : "➕ Novo"} {aba === "servicos" ? "Serviço" : "Peça"}
          </div>
          <Field label="Nome *" value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder={aba === "servicos" ? "Ex: Troca de óleo" : "Ex: Pastilha de freio"} />
          <Row>
            <div style={{ flex: 1, minWidth: 100 }}>
              <Field label="Valor (R$)" value={form.valor}
                onChange={e => setForm({ ...form, valor: e.target.value })}
                placeholder="0,00" type="number" inputMode="decimal" />
            </div>
            {aba === "pecas" && (
              <div style={{ flex: 1, minWidth: 80 }}>
                <Field label="Estoque" value={form.estoque}
                  onChange={e => setForm({ ...form, estoque: e.target.value })}
                  placeholder="Qtd" type="number" inputMode="numeric" />
              </div>
            )}
          </Row>
          <Field label="Descrição" value={form.descricao}
            onChange={e => setForm({ ...form, descricao: e.target.value })}
            placeholder="Detalhes opcionais..." />
          <Row>
            <Btn onClick={salvar} style={{ flex: 1 }}>💾 Salvar</Btn>
            {editId && <Btn onClick={() => { setEditId(null); setForm({ nome: "", valor: "", tipo, descricao: "", estoque: "" }); }} color={C.muted}>Cancelar</Btn>}
          </Row>
          {msg && <div style={{ color: C.green, fontWeight: 700, marginTop: 8 }}>{msg}</div>}
        </Card>

        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar..." style={{ marginBottom: 12 }} />

        {filtrados.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, padding: 30 }}>
            {busca ? "Nenhum resultado" : `Nenhum${aba === "servicos" ? " serviço" : "a peça"} cadastrado(a)`}
          </div>
        )}

        {filtrados.map(p => (
          <div key={p.id} style={{ background: C.card, borderRadius: 14, padding: "12px 14px", marginBottom: 8, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{p.nome}</div>
                {p.descricao && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{p.descricao}</div>}
                {p.estoque !== "" && p.estoque !== undefined && (
                  <div style={{ fontSize: 12, color: C.blue, marginTop: 2 }}>Estoque: {p.estoque} un</div>
                )}
              </div>
              <div style={{ color: C.accent, fontWeight: 900, fontSize: 17, marginLeft: 10 }}>{fmt(p.valor)}</div>
            </div>
            <Row gap={6} style={{ marginTop: 10 }}>
              <Btn small onClick={() => editar(p)} color={C.blue}>✏️ Editar</Btn>
              <Btn small onClick={() => excluir(p.id)} color={C.red}>🗑️</Btn>
            </Row>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── IMPRESSÃO ────────────────────────────────────────────────────────────────
const imprimirDoc = (html) => {
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Imprimir</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;padding:20px;max-width:720px;margin:0 auto}
      .header{text-align:center;border-bottom:3px solid #f97316;padding-bottom:16px;margin-bottom:20px}
      .header h1{font-size:26px;color:#f97316;letter-spacing:1px}
      .header p{color:#666;font-size:13px;margin-top:4px}
      .badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;margin-top:6px}
      .badge-orc{background:#fff3e0;color:#e65100;border:1px solid #f97316}
      .badge-venda{background:#e8f5e9;color:#2e7d32;border:1px solid #4caf50}
      .section{margin-bottom:18px}
      .section-title{font-size:13px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #eee}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .field{background:#f9f9f9;border-radius:8px;padding:8px 12px}
      .field-label{font-size:10px;color:#999;font-weight:700;text-transform:uppercase}
      .field-value{font-size:14px;font-weight:700;color:#1a1a1a;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-bottom:10px}
      th{background:#f97316;color:#fff;padding:9px 12px;text-align:left;font-size:13px}
      td{padding:9px 12px;border-bottom:1px solid #eee;font-size:14px}
      tr:last-child td{border-bottom:none}
      .total-row{background:#fff3e0;font-weight:900;font-size:16px}
      .total-row td{color:#e65100;padding:12px}
      .pagamento{display:flex;gap:10px;justify-content:center;margin:16px 0;flex-wrap:wrap}
      .pag-item{background:#f5f5f5;border-radius:10px;padding:10px 18px;text-align:center;font-weight:700;font-size:14px;border:1px solid #e0e0e0}
      .obs{background:#fff8e1;border-left:4px solid #f97316;padding:10px 14px;border-radius:0 8px 8px 0;font-size:13px;color:#555}
      .footer{text-align:center;margin-top:24px;padding-top:16px;border-top:2px dashed #eee;color:#888;font-size:12px;line-height:2}
      .agradecimento{background:#e8f5e9;border-radius:12px;padding:14px;text-align:center;margin:16px 0;font-size:14px;color:#2e7d32;font-weight:700;line-height:1.8}
      @media print{body{padding:10px}button{display:none!important}.no-print{display:none!important}}
    </style>
  </head><body>${html}
    <div class="no-print" style="text-align:center;margin-top:24px">
      <button onclick="window.print()" style="background:#f97316;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">🖨️ Imprimir / Salvar PDF</button>
      <button onclick="window.close()" style="background:#eee;color:#333;border:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-left:10px">✕ Fechar</button>
    </div>
  </body></html>`);
  w.document.close();
};

const gerarHtmlOrcamento = (orc, emp) => {
  const linhas = orc.itens?.map(i => `
    <tr>
      <td>${i.nome}</td>
      <td style="text-align:center">${i.quantidade}</td>
      <td style="text-align:right">${fmt(Number(i.valor))}</td>
      <td style="text-align:right;font-weight:700">${fmt(Number(i.valor) * Number(i.quantidade))}</td>
    </tr>`).join("") || "";
  return `
    <div class="header">
      <h1>🔧 ${emp.nome || "Oficina Auto"}</h1>
      ${emp.ramo ? `<p>${emp.ramo}</p>` : ""}
      ${emp.endereco ? `<p>${emp.endereco}${emp.cidade ? " — " + emp.cidade : ""}</p>` : ""}
      ${emp.telefone ? `<p>📞 ${emp.telefone}</p>` : ""}
      <span class="badge badge-orc">ORÇAMENTO</span>
    </div>
    <div class="section">
      <div class="section-title">👤 Dados do Cliente</div>
      <div class="grid2">
        <div class="field"><div class="field-label">Nome</div><div class="field-value">${orc.clienteNome || "—"}</div></div>
        <div class="field"><div class="field-label">Telefone</div><div class="field-value">${orc.clienteTelefone || "—"}</div></div>
        <div class="field"><div class="field-label">Veículo</div><div class="field-value">${orc.clienteVeiculo || "—"}</div></div>
        <div class="field"><div class="field-label">Placa</div><div class="field-value">${orc.clientePlaca || "—"}</div></div>
        <div class="field"><div class="field-label">Data</div><div class="field-value">${fmtData(orc.criadoEm || orc.data)}</div></div>
        ${orc.validade ? `<div class="field"><div class="field-label">Validade</div><div class="field-value">${fmtData(orc.validade)}</div></div>` : ""}
      </div>
    </div>
    <div class="section">
      <div class="section-title">🔩 Serviços e Peças</div>
      <table>
        <thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${linhas}
          <tr class="total-row"><td colspan="3">TOTAL DO ORÇAMENTO</td><td style="text-align:right">${fmt(orc.total)}</td></tr>
        </tbody>
      </table>
    </div>
    ${orc.obs ? `<div class="section"><div class="section-title">📝 Observações</div><div class="obs">${orc.obs}</div></div>` : ""}
    <div class="footer">
      <p>Este orçamento tem validade conforme data indicada acima.</p>
      <p>Para autorizar, responda com <strong>AUTORIZO</strong> via WhatsApp.</p>
      ${emp.nome ? `<p><strong>${emp.nome}</strong></p>` : ""}
    </div>`;
};

const gerarHtmlVenda = (v, emp) => {
  const linhas = v.itens?.map(i => `
    <tr>
      <td>${i.nome}</td>
      <td style="text-align:center">${i.quantidade}</td>
      <td style="text-align:right">${fmt(Number(i.valor))}</td>
      <td style="text-align:right;font-weight:700">${fmt(Number(i.valor) * Number(i.quantidade))}</td>
    </tr>`).join("") || "";
  return `
    <div class="header">
      <h1>🔧 ${emp.nome || "Oficina Auto"}</h1>
      ${emp.ramo ? `<p>${emp.ramo}</p>` : ""}
      ${emp.endereco ? `<p>${emp.endereco}${emp.cidade ? " — " + emp.cidade : ""}</p>` : ""}
      ${emp.telefone ? `<p>📞 ${emp.telefone}</p>` : ""}
      <span class="badge badge-venda">✅ SERVIÇO CONCLUÍDO</span>
    </div>
    <div class="section">
      <div class="section-title">👤 Dados do Cliente</div>
      <div class="grid2">
        <div class="field"><div class="field-label">Nome</div><div class="field-value">${v.clienteNome || "—"}</div></div>
        <div class="field"><div class="field-label">Telefone</div><div class="field-value">${v.clienteTelefone || "—"}</div></div>
        <div class="field"><div class="field-label">Veículo</div><div class="field-value">${v.clienteVeiculo || "—"}</div></div>
        <div class="field"><div class="field-label">Placa</div><div class="field-value">${v.clientePlaca || "—"}</div></div>
        <div class="field"><div class="field-label">Data de Conclusão</div><div class="field-value">${fmtData(v.data)}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">🔩 Serviços Realizados</div>
      <table>
        <thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${linhas}
          <tr class="total-row"><td colspan="3">TOTAL</td><td style="text-align:right">${fmt(v.total)}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="section">
      <div class="section-title">💳 Formas de Pagamento</div>
      <div class="pagamento">
        <div class="pag-item">📱 PIX</div>
        <div class="pag-item">💳 Cartão</div>
        <div class="pag-item">💵 Dinheiro</div>
      </div>
    </div>
    <div class="agradecimento">
      🚗 Seu veículo está pronto para retirada!<br/>
      Obrigado pela confiança e preferência!<br/>
      Volte sempre! 😊
    </div>
    <div class="footer">
      ${emp.nome ? `<strong>${emp.nome}</strong><br/>` : ""}
      ${emp.telefone ? `📞 ${emp.telefone}<br/>` : ""}
      ${emp.endereco ? `📍 ${emp.endereco}` : ""}
    </div>`;
};

// ─── ORÇAMENTO ────────────────────────────────────────────────────────────────
function OrcamentoScreen({ usuario, editOrcamento }) {
  const VAZIO = {
    clienteNome: "", clienteTelefone: "", clientePlaca: "",
    clienteVeiculo: "", data: hoje(), validade: "",
    itens: [], obs: "", fotos: [], id: null,
  };
  const [form, setForm]   = useState(editOrcamento || VAZIO);
  const [buscaC, setBuscaC] = useState("");
  const [sugsC, setSugsC]   = useState([]);
  const [buscaP, setBuscaP] = useState("");
  const [sugsP, setSugsP]   = useState([]);
  const [addItem, setAI]    = useState({ tipo: "peca", produtoId: "", nome: "", valor: "", quantidade: 1 });
  const [msg, setMsg]       = useState("");

  const total = form.itens.reduce((s, i) => s + Number(i.valor) * Number(i.quantidade || 1), 0);

  useEffect(() => {
    if (buscaC.length < 2) { setSugsC([]); return; }
    setSugsC(db.get("clientes").filter(c =>
      [c.nome, c.telefone, c.placa, c.modelo].some(v => v?.toLowerCase().includes(buscaC.toLowerCase()))
    ).slice(0, 5));
  }, [buscaC]);

  useEffect(() => {
    if (buscaP.length < 1) { setSugsP([]); return; }
    setSugsP(db.get("produtos").filter(p =>
      p.nome?.toLowerCase().includes(buscaP.toLowerCase())
    ).slice(0, 5));
  }, [buscaP]);

  const selCliente = c => {
    setForm(f => ({
      ...f, clienteNome: c.nome, clienteTelefone: c.telefone,
      clientePlaca: c.placa || "",
      clienteVeiculo: [c.marca, c.modelo, c.ano].filter(Boolean).join(" "),
    }));
    setBuscaC(""); setSugsC([]);
  };

  const selProduto = p => {
    setAI(a => ({ ...a, produtoId: p.id, nome: p.nome, valor: p.valor, tipo: p.tipo }));
    setBuscaP(""); setSugsP([]);
  };

  const adicionarItem = () => {
    if (!addItem.nome) { alert("Selecione ou preencha um item."); return; }
    setForm(f => ({ ...f, itens: [...f.itens, { ...addItem, id: uid() }] }));
    setAI({ tipo: "peca", produtoId: "", nome: "", valor: "", quantidade: 1 });
  };

  const salvar = () => {
    if (!form.clienteNome.trim()) { alert("Informe o cliente."); return; }
    if (form.itens.length === 0) { alert("Adicione ao menos um item."); return; }
    const orc = {
      ...form, id: form.id || uid(), total,
      status: "pendente",
      criadoEm: form.criadoEm || hoje(),
      criadoPor: usuario.nome,
    };
    const all = db.get("orcamentos");
    db.set("orcamentos", form.id ? all.map(o => o.id === form.id ? orc : o) : [...all, orc]);
    setForm({ ...orc });
    setMsg("✅ Orçamento salvo! Aguardando autorização do cliente.");
    setTimeout(() => setMsg(""), 3500);
  };

  const enviarWA = () => {
    if (!form.clienteTelefone) { alert("Informe o telefone do cliente."); return; }
    if (form.itens.length === 0) { alert("Adicione ao menos um item antes de enviar."); return; }
    const emp = db.getOne("empresa");
    const linhas = form.itens.map((i, n) => `  ${n + 1}. ${i.nome} x${i.quantidade} = ${fmt(Number(i.valor) * Number(i.quantidade))}`).join("\n");
    const texto =
`🔧 *ORÇAMENTO DE SERVIÇO*
${emp.nome ? `_${emp.nome}_` : ""}
━━━━━━━━━━━━━━━━━━━━
👤 Cliente: *${form.clienteNome}*
🚗 Veículo: *${form.clienteVeiculo || "—"}*
🪪 Placa: *${form.clientePlaca || "—"}*
📅 Data: ${fmtData(form.data)}${form.validade ? `\n⏳ Válido até: ${fmtData(form.validade)}` : ""}
━━━━━━━━━━━━━━━━━━━━
🔩 *SERVIÇOS / PEÇAS:*
${linhas}
━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL: ${fmt(total)}*
${form.obs ? `\n📝 Obs: ${form.obs}\n` : ""}
━━━━━━━━━━━━━━━━━━━━
✅ *Para AUTORIZAR este orçamento, responda:*
👉 *AUTORIZO* — e iniciaremos o serviço imediatamente.
❌ Para recusar, responda: *NÃO AUTORIZO*

${emp.telefone ? `📞 Dúvidas: ${emp.telefone}` : ""}`;
    const tel = form.clienteTelefone.replace(/\D/g, "");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <TopBar title="📋 Orçamento" />
      <div style={{ padding: "12px 16px" }}>

        {/* Cliente */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>👤 Cliente</div>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Lbl>Buscar cliente cadastrado</Lbl>
            <input value={buscaC} onChange={e => setBuscaC(e.target.value)} placeholder="Nome, placa ou modelo..." />
            {sugsC.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.accent}`, borderRadius: 10, zIndex: 99, boxShadow: "0 8px 24px #0008", overflow: "hidden" }}>
                {sugsC.map(c => (
                  <div key={c.id} onClick={() => selCliente(c)} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                    <div style={{ fontWeight: 700 }}>{c.nome}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{[c.marca, c.modelo, c.placa].filter(Boolean).join(" • ")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Field label="Nome *" value={form.clienteNome}
            onChange={e => setForm({ ...form, clienteNome: e.target.value })} placeholder="Nome do cliente" />
          <Row>
            <div style={{ flex: 1 }}>
              <Field label="Telefone" value={form.clienteTelefone}
                onChange={e => setForm({ ...form, clienteTelefone: e.target.value })}
                placeholder="(99) 99999-9999" type="tel" inputMode="tel" />
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Placa" value={form.clientePlaca}
                onChange={e => setForm({ ...form, clientePlaca: e.target.value.toUpperCase() })} placeholder="ABC-1234" />
            </div>
          </Row>
          <Field label="Veículo (marca/modelo/ano)" value={form.clienteVeiculo}
            onChange={e => setForm({ ...form, clienteVeiculo: e.target.value })} placeholder="Ex: Toyota Corolla 2020" />
          <Row>
            <div style={{ flex: 1 }}>
              <Field label="Data" type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Validade" type="date" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} />
            </div>
          </Row>
        </Card>

        {/* Itens */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>🔧 Itens do Orçamento</div>

          {/* Busca no banco */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Lbl>🔍 Buscar no banco de peças/serviços</Lbl>
            <input value={buscaP} onChange={e => setBuscaP(e.target.value)}
              placeholder="Digite o nome da peça ou serviço..." />
            {sugsP.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.accent}`, borderRadius: 10, zIndex: 99, boxShadow: "0 8px 24px #0008", overflow: "hidden" }}>
                {sugsP.map(p => (
                  <div key={p.id} onClick={() => selProduto(p)} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.nome}</div>
                      <Badge color={p.tipo === "servico" ? C.blue : C.green}>{p.tipo === "servico" ? "🛠️ Serviço" : "🔩 Peça"}</Badge>
                    </div>
                    <div style={{ color: C.accent, fontWeight: 800 }}>{fmt(p.valor)}</div>
                  </div>
                ))}
              </div>
            )}
            {buscaP.length >= 1 && sugsP.length === 0 && (
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginTop: 4, fontSize: 13, color: C.muted }}>
                Nenhum resultado — preencha abaixo e adicione manualmente
              </div>
            )}
          </div>

          {/* Divisor */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>OU PREENCHA MANUALMENTE</div>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: 10 }}>
            <Lbl>Tipo</Lbl>
            <Row gap={8}>
              {[["peca", "🔩 Peça"], ["servico", "🛠️ Serviço"]].map(([val, label]) => (
                <button key={val} onClick={() => setAI({ ...addItem, tipo: val })} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10, fontWeight: 700, fontSize: 13,
                  background: addItem.tipo === val ? (val === "servico" ? C.blue : C.green) : C.bg,
                  color: addItem.tipo === val ? "#fff" : C.muted,
                  border: `1.5px solid ${addItem.tipo === val ? (val === "servico" ? C.blue : C.green) : C.border}`,
                }}>{label}</button>
              ))}
            </Row>
          </div>

          {/* Campos do item */}
          <Row style={{ marginBottom: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 2, minWidth: 100 }}>
              <Field label="Descrição *" value={addItem.nome}
                onChange={e => setAI({ ...addItem, nome: e.target.value })}
                placeholder={addItem.tipo === "servico" ? "Ex: Troca de óleo" : "Ex: Filtro de óleo"} />
            </div>
            <div style={{ flex: 1, minWidth: 70 }}>
              <Field label="R$ Unit." value={addItem.valor}
                onChange={e => setAI({ ...addItem, valor: e.target.value })}
                placeholder="0,00" type="number" inputMode="decimal" />
            </div>
            <div style={{ flex: 1, minWidth: 55 }}>
              <Field label="Qtd" value={addItem.quantidade}
                onChange={e => setAI({ ...addItem, quantidade: e.target.value })}
                type="number" inputMode="numeric" />
            </div>
          </Row>

          {/* Subtotal preview */}
          {addItem.nome && addItem.valor && (
            <div style={{ background: C.bg, borderRadius: 8, padding: "6px 12px", marginBottom: 10, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: C.muted }}>Subtotal:</span>
              <span style={{ color: C.accent, fontWeight: 800 }}>{fmt(Number(addItem.valor) * Number(addItem.quantidade || 1))}</span>
            </div>
          )}

          {/* Botões de ação */}
          <Row gap={8} style={{ marginBottom: 12 }}>
            <Btn onClick={adicionarItem} style={{ flex: 2 }} color={C.blue}>
              ＋ Adicionar ao Orçamento
            </Btn>
            <Btn onClick={() => {
              if (!addItem.nome.trim()) { alert("Informe o nome antes de salvar."); return; }
              if (!addItem.valor) { alert("Informe o valor antes de salvar."); return; }
              const prods = db.get("produtos");
              if (prods.find(p => p.nome.toLowerCase() === addItem.nome.toLowerCase())) {
                alert("Já existe um produto com esse nome no banco!"); return;
              }
              db.set("produtos", [...prods, {
                id: uid(), nome: addItem.nome, valor: addItem.valor,
                tipo: addItem.tipo, descricao: "", estoque: "", criadoEm: hoje(),
              }]);
              alert(`✅ "${addItem.nome}" salvo no banco de produtos!`);
            }} style={{ flex: 1 }} color={C.green}>
              💾 Salvar
            </Btn>
          </Row>

          {/* Legenda */}
          <div style={{ background: C.bg, borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            💡 <b style={{ color: C.text }}>Dica:</b> Clique em <b style={{ color: C.green }}>💾 Salvar</b> para guardar no banco e usar em próximos orçamentos sem precisar redigitar.
          </div>

          {/* Lista de itens adicionados */}
          {form.itens.length === 0 && (
            <div style={{ textAlign: "center", color: C.muted, padding: 16, fontSize: 13 }}>
              Nenhum item adicionado ainda
            </div>
          )}

          {form.itens.map(item => (
            <div key={item.id} style={{ background: C.bg, borderRadius: 10, padding: "10px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.nome}</div>
                  <Badge color={item.tipo === "servico" ? C.blue : C.green} >
                    {item.tipo === "servico" ? "Serviço" : "Peça"}
                  </Badge>
                </div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  x{item.quantidade} × {fmt(Number(item.valor))}
                </div>
              </div>
              <div style={{ fontWeight: 800, color: C.accent }}>{fmt(Number(item.valor) * Number(item.quantidade))}</div>
              <button onClick={() => setForm(f => ({ ...f, itens: f.itens.filter(x => x.id !== item.id) }))}
                style={{ background: C.red + "22", color: C.red, borderRadius: 8, padding: "6px 10px", fontWeight: 900, minWidth: 36, minHeight: 36 }}>×</button>
            </div>
          ))}

          {form.itens.length > 0 && (
            <div style={{ background: C.accent + "22", borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <div style={{ fontWeight: 700 }}>TOTAL DO ORÇAMENTO</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.accent }}>{fmt(total)}</div>
            </div>
          )}
        </Card>

        {/* Fotos do Veículo */}
        <Card style={{ marginBottom: 12 }}>
          <FotoUpload fotos={form.fotos || []} onChange={fotos => setForm(f => ({ ...f, fotos }))} />
        </Card>

        {/* Obs */}
        <Card style={{ marginBottom: 12 }}>
          <Lbl>📝 Observações</Lbl>
          <textarea value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })}
            placeholder="Observações sobre o serviço..." rows={3}
            style={{ width: "100%", resize: "vertical" }} />
        </Card>

        {/* Ações */}
        <div style={{ display: "grid", gap: 8 }}>
          <Btn onClick={salvar} style={{ width: "100%" }}>💾 Salvar Orçamento</Btn>
          <Btn onClick={enviarWA} color="#25d366" style={{ width: "100%" }}>
            📲 Enviar por WhatsApp (pedir autorização)
          </Btn>
          <Btn onClick={() => {
            if (form.itens.length === 0) { alert("Adicione itens antes de imprimir."); return; }
            const emp = db.getOne("empresa");
            imprimirDoc(gerarHtmlOrcamento({ ...form, total }, emp));
          }} color={C.blue} style={{ width: "100%" }}>
            🖨️ Imprimir / Salvar PDF
          </Btn>
          <Btn onClick={() => setForm(VAZIO)} color={C.muted} style={{ width: "100%" }}>
            🗑️ Limpar formulário
          </Btn>
        </div>

        {/* Aviso de fluxo */}
        <div style={{ background: C.blue + "18", border: `1px solid ${C.blue}44`, borderRadius: 12, padding: "12px 14px", marginTop: 10 }}>
          <div style={{ fontWeight: 800, color: C.blue, marginBottom: 4 }}>ℹ️ Como funciona</div>
          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.8 }}>
            1. Salve o orçamento<br/>
            2. Envie pelo WhatsApp — o cliente receberá uma mensagem pedindo autorização<br/>
            3. Quando o cliente autorizar, vá em <b style={{ color: C.text }}>Vendas → Orçamentos Pendentes</b> e clique em <b style={{ color: C.green }}>✅ Autorizar</b>
          </div>
        </div>

        {msg && (
          <div style={{
            background: msg.includes("✅") ? C.green + "22" : C.red + "22",
            border: `1px solid ${msg.includes("✅") ? C.green : C.red}`,
            borderRadius: 12, padding: 14,
            color: msg.includes("✅") ? C.green : C.red,
            fontWeight: 700, marginTop: 12, textAlign: "center",
          }}>{msg}</div>
        )}
      </div>
    </div>
  );
}

// ─── VENDAS ───────────────────────────────────────────────────────────────────
function VendasScreen({ navigate, setEditOrcamento }) {
  const [aba, setAba]         = useState("pendentes");
  const [orcamentos, setOrcs] = useState(() => db.get("orcamentos"));
  const [vendas, setVendas]   = useState(() => db.get("vendas"));
  const [busca, setBusca]     = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [msg, setMsg]         = useState("");

  const pendentes = orcamentos
    .filter(o => o.status !== "autorizado")
    .filter(o => [o.clienteNome, o.clientePlaca, o.clienteVeiculo].some(x => x?.toLowerCase().includes(busca.toLowerCase())))
    .sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));

  const vendasFiltradas = vendas
    .filter(v => [v.clienteNome, v.clientePlaca, v.clienteVeiculo].some(x => x?.toLowerCase().includes(busca.toLowerCase())))
    .sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  const totalVendas = vendasFiltradas.reduce((s, v) => s + Number(v.total || 0), 0);

  const autorizar = (orc) => {
    if (!confirm(`Autorizar orçamento de ${orc.clienteNome} no valor de ${fmt(orc.total)}?`)) return;
    // Atualiza orçamento para autorizado
    const allOrcs = db.get("orcamentos").map(o => o.id === orc.id ? { ...o, status: "autorizado", autorizadoEm: hoje() } : o);
    db.set("orcamentos", allOrcs);
    setOrcs(allOrcs);
    // Cria venda
    const allVendas = db.get("vendas");
    if (!allVendas.find(v => v.orcamentoId === orc.id)) {
      const novaVenda = {
        id: uid(), orcamentoId: orc.id,
        clienteNome: orc.clienteNome, clienteTelefone: orc.clienteTelefone,
        clientePlaca: orc.clientePlaca, clienteVeiculo: orc.clienteVeiculo,
        total: orc.total, data: hoje(), itens: orc.itens,
        fotos: orc.fotos || [],
        criadoPor: orc.criadoPor,
      };
      db.set("vendas", [...allVendas, novaVenda]);
      setVendas([...allVendas, novaVenda]);
    }
    setDetalhe(null);
    setMsg("✅ Orçamento autorizado! Registrado como venda.");
    setTimeout(() => setMsg(""), 3000);
    setAba("vendas");
  };

  const excluirOrc = id => {
    if (!confirm("Excluir este orçamento?")) return;
    const u = db.get("orcamentos").filter(o => o.id !== id);
    db.set("orcamentos", u); setOrcs(u); setDetalhe(null);
  };

  const excluirVenda = id => {
    if (!confirm("Excluir esta venda?")) return;
    const u = db.get("vendas").filter(v => v.id !== id);
    db.set("vendas", u); setVendas(u); setDetalhe(null);
  };

  // ── DETALHE ORÇAMENTO PENDENTE ────────────────────────────────────────────
  if (detalhe && detalhe._tipo === "orcamento") {
    const o = detalhe;
    return (
      <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: NAV_H + 16 }}>
        <TopBar title="📋 Orçamento Pendente" onBack={() => setDetalhe(null)} />
        <div style={{ padding: 16 }}>

          {/* Status banner */}
          <div style={{ background: C.gold + "22", border: `1px solid ${C.gold}55`, borderRadius: 14, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 28 }}>⏳</div>
            <div>
              <div style={{ fontWeight: 800, color: C.gold }}>Aguardando Autorização</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                Criado em {fmtData(o.criadoEm)} por {o.criadoPor}
              </div>
            </div>
          </div>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{o.clienteNome}</div>
            <div style={{ color: C.muted, marginTop: 4 }}>{o.clienteVeiculo} {o.clientePlaca && `• ${o.clientePlaca}`}</div>
            {o.clienteTelefone && (
              <a href={`https://wa.me/55${o.clienteTelefone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                style={{ color: C.green, display: "block", marginTop: 6, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                💬 {o.clienteTelefone} — Abrir WhatsApp
              </a>
            )}
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>🔧 Itens</div>
            {o.itens?.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                <span>{item.nome} <span style={{ color: C.muted }}>x{item.quantidade}</span></span>
                <span style={{ color: C.accent, fontWeight: 700 }}>{fmt(Number(item.valor) * Number(item.quantidade))}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontWeight: 900, fontSize: 20 }}>
              <span>Total</span>
              <span style={{ color: C.accent }}>{fmt(o.total)}</span>
            </div>
          </Card>

          {o.obs && (
            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>📝 Observações</div>
              <div style={{ color: C.muted, fontSize: 14 }}>{o.obs}</div>
            </Card>
          )}

          {o.fotos && o.fotos.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>📸 Fotos do Veículo ({o.fotos.length})</div>
              <FotoUpload fotos={o.fotos} onChange={() => {}} readOnly />
            </Card>
          )}

          {/* Ações */}
          <div style={{ display: "grid", gap: 8 }}>
            <Btn onClick={() => autorizar(o)} color={C.green} style={{ width: "100%", fontSize: 16 }}>
              ✅ Cliente Autorizou — Registrar como Venda
            </Btn>
            <Btn color={C.blue} style={{ width: "100%" }} onClick={() => {
              const emp = db.getOne("empresa");
              const linhas = o.itens.map((i, n) => `  ${n + 1}. ${i.nome} x${i.quantidade} = ${fmt(Number(i.valor) * Number(i.quantidade))}`).join("\n");
              const texto = `🔧 *ORÇAMENTO DE SERVIÇO*\n${emp.nome ? `_${emp.nome}_` : ""}\n━━━━━━━━━━━━━━━━━━━━\n👤 Cliente: *${o.clienteNome}*\n🚗 Veículo: *${o.clienteVeiculo || "—"}*\n🪪 Placa: *${o.clientePlaca || "—"}*\n📅 Data: ${fmtData(o.criadoEm)}\n━━━━━━━━━━━━━━━━━━━━\n🔩 *SERVIÇOS / PEÇAS:*\n${linhas}\n━━━━━━━━━━━━━━━━━━━━\n💰 *TOTAL: ${fmt(o.total)}*\n━━━━━━━━━━━━━━━━━━━━\n✅ *Para AUTORIZAR este orçamento, responda:*\n👉 *AUTORIZO* — e iniciaremos o serviço imediatamente.\n❌ Para recusar, responda: *NÃO AUTORIZO*`;
              const tel = o.clienteTelefone?.replace(/\D/g, "");
              if (!tel) { alert("Sem telefone cadastrado."); return; }
              window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`, "_blank");
            }}>
              📲 Reenviar por WhatsApp
            </Btn>
            <Btn onClick={() => imprimirDoc(gerarHtmlOrcamento(o, db.getOne("empresa")))} color={C.purple} style={{ width: "100%" }}>
              🖨️ Imprimir / Salvar PDF
            </Btn>
            <Btn onClick={() => excluirOrc(o.id)} color={C.red} style={{ width: "100%" }}>
              🗑️ Excluir Orçamento
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  // ── DETALHE VENDA ─────────────────────────────────────────────────────────
  if (detalhe && detalhe._tipo === "venda") {
    const v = detalhe;
    const emp = db.getOne("empresa");

    const enviarVeiculoPronto = () => {
      if (!v.clienteTelefone) { alert("Sem telefone cadastrado."); return; }
      const linhas = v.itens?.map((i, n) => `  ${n+1}. ${i.nome} x${i.quantidade} = ${fmt(Number(i.valor)*Number(i.quantidade))}`).join("\n");
      const texto =
`🔧 *${emp.nome || "Oficina Auto"}*
━━━━━━━━━━━━━━━━━━━━

🎉 *Olá, ${v.clienteNome}!*
Temos uma ótima notícia!

🚗 Seu veículo *${v.clienteVeiculo || ""}${v.clientePlaca ? " — Placa " + v.clientePlaca : ""}* está *PRONTO* para retirada! ✅

━━━━━━━━━━━━━━━━━━━━
🔩 *SERVIÇOS REALIZADOS:*
${linhas}
━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL: ${fmt(v.total)}*

💳 *Formas de Pagamento:*
  📱 PIX
  💳 Cartão (débito/crédito)
  💵 Dinheiro

━━━━━━━━━━━━━━━━━━━━
🙏 *Obrigado pela preferência!*
Foi um prazer atendê-lo(a).
Conte conosco sempre! 😊
${emp.telefone ? `\n📞 ${emp.telefone}` : ""}`;
      window.open(`https://wa.me/55${v.clienteTelefone.replace(/\D/g,"")}?text=${encodeURIComponent(texto)}`, "_blank");
    };

    return (
      <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: NAV_H + 16 }}>
        <TopBar title="💰 Venda Autorizada" onBack={() => setDetalhe(null)} />
        <div style={{ padding: 16 }}>

          <div style={{ background: C.green + "22", border: `1px solid ${C.green}55`, borderRadius: 14, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 28 }}>✅</div>
            <div>
              <div style={{ fontWeight: 800, color: C.green }}>Venda Autorizada</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                Registrada em {fmtData(v.data)} por {v.criadoPor}
              </div>
            </div>
          </div>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{v.clienteNome}</div>
            <div style={{ color: C.muted, marginTop: 4 }}>{v.clienteVeiculo} {v.clientePlaca && `• ${v.clientePlaca}`}</div>
            {v.clienteTelefone && (
              <a href={`tel:${v.clienteTelefone}`} style={{ color: C.green, display: "block", marginTop: 6, fontWeight: 700, textDecoration: "none" }}>
                📱 {v.clienteTelefone}
              </a>
            )}
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>🔧 Serviços Realizados</div>
            {v.itens?.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                <span>{item.nome} <span style={{ color: C.muted }}>x{item.quantidade}</span></span>
                <span style={{ color: C.accent, fontWeight: 700 }}>{fmt(Number(item.valor) * Number(item.quantidade))}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontWeight: 900, fontSize: 20 }}>
              <span>Total</span>
              <span style={{ color: C.green }}>{fmt(v.total)}</span>
            </div>
          </Card>

          {v.fotos && v.fotos.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>📸 Fotos do Veículo ({v.fotos.length})</div>
              <FotoUpload fotos={v.fotos} onChange={() => {}} readOnly />
            </Card>
          )}

          {/* Formas de pagamento */}
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>💳 Formas de Pagamento</div>
            <Row gap={8} style={{ justifyContent: "center" }}>
              {[["📱", "PIX"], ["💳", "Cartão"], ["💵", "Dinheiro"]].map(([icon, label]) => (
                <div key={label} style={{ flex: 1, background: C.bg, borderRadius: 10, padding: "10px 6px", textAlign: "center", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 22 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </Row>
          </Card>

          {/* Ações */}
          <div style={{ display: "grid", gap: 8 }}>
            <Btn onClick={enviarVeiculoPronto} color="#25d366" style={{ width: "100%", fontSize: 15 }}>
              📲 Avisar Cliente — Veículo Pronto!
            </Btn>
            <Btn onClick={() => imprimirDoc(gerarHtmlVenda(v, emp))} color={C.blue} style={{ width: "100%" }}>
              🖨️ Imprimir / Salvar PDF
            </Btn>
            <Btn onClick={() => excluirVenda(v.id)} color={C.red} style={{ width: "100%" }}>
              🗑️ Excluir Venda
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  // ── LISTA ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: NAV_H + 16 }}>
      <TopBar title="💰 Orçamentos & Vendas" />

      {/* Abas */}
      <div style={{ display: "flex", background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => setAba("pendentes")} style={{
          flex: 1, padding: "13px 0", fontWeight: 700, fontSize: 14,
          background: "transparent", color: aba === "pendentes" ? C.gold : C.muted,
          borderBottom: aba === "pendentes" ? `2px solid ${C.gold}` : "2px solid transparent",
        }}>
          ⏳ Pendentes
          {pendentes.length > 0 && (
            <span style={{ background: C.gold, color: "#000", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 900, marginLeft: 6 }}>
              {pendentes.length}
            </span>
          )}
        </button>
        <button onClick={() => setAba("vendas")} style={{
          flex: 1, padding: "13px 0", fontWeight: 700, fontSize: 14,
          background: "transparent", color: aba === "vendas" ? C.green : C.muted,
          borderBottom: aba === "vendas" ? `2px solid ${C.green}` : "2px solid transparent",
        }}>✅ Vendas</button>
      </div>

      <div style={{ padding: "12px 16px" }}>
        {msg && (
          <div style={{ background: C.green + "22", border: `1px solid ${C.green}`, borderRadius: 12, padding: 12, color: C.green, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
            {msg}
          </div>
        )}

        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar cliente ou placa..." style={{ marginBottom: 12 }} />

        {/* ── PENDENTES ── */}
        {aba === "pendentes" && (
          <>
            {pendentes.length === 0 && (
              <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                {busca ? "Nenhum orçamento encontrado" : "Nenhum orçamento pendente"}
                <div style={{ fontSize: 13, marginTop: 8 }}>Crie um orçamento na aba Orçamento</div>
              </div>
            )}
            {pendentes.map(o => (
              <div key={o.id} onClick={() => setDetalhe({ ...o, _tipo: "orcamento" })} style={{
                background: C.card, borderRadius: 14, padding: "14px 16px", marginBottom: 8,
                border: `1.5px solid ${C.gold}44`, cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Badge color={C.gold}>⏳ Pendente</Badge>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{o.clienteNome}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                      {o.clienteVeiculo} {o.clientePlaca && `• ${o.clientePlaca}`}
                    </div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>📅 {fmtData(o.criadoEm)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900, fontSize: 18, color: C.accent }}>{fmt(o.total)}</div>
                    <div style={{ color: C.muted, fontSize: 20, marginTop: 4 }}>›</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── VENDAS ── */}
        {aba === "vendas" && (
          <>
            {vendasFiltradas.length > 0 && (
              <Card style={{ marginBottom: 12, borderColor: C.green + "55" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>Total do período</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{vendasFiltradas.length} venda{vendasFiltradas.length !== 1 ? "s" : ""} autorizada{vendasFiltradas.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 24, color: C.green }}>{fmt(totalVendas)}</div>
                </div>
              </Card>
            )}

            {vendasFiltradas.length === 0 && (
              <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
                {busca ? "Nenhuma venda encontrada" : "Nenhuma venda autorizada ainda"}
                <div style={{ fontSize: 13, marginTop: 8 }}>Autorize um orçamento na aba Pendentes</div>
              </div>
            )}

            {vendasFiltradas.map(v => (
              <div key={v.id} onClick={() => setDetalhe({ ...v, _tipo: "venda" })} style={{
                background: C.card, borderRadius: 14, padding: "14px 16px", marginBottom: 8,
                border: `1.5px solid ${C.green}33`, cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Badge color={C.green}>✅ Autorizada</Badge>
                    </div>
                    <div style={{ fontWeight: 800 }}>{v.clienteNome}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                      {v.clienteVeiculo} {v.clientePlaca && `• ${v.clientePlaca}`}
                    </div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>📅 {fmtData(v.data)}</div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: C.green }}>{fmt(v.total)}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
function ConfigScreen({ usuario }) {
  const [aba, setAba]         = useState("empresa");
  const [empresa, setEmpresa] = useState(() => db.getOne("empresa"));
  const [usuarios, setUsuarios] = useState(() => db.get("usuarios"));
  const [novoUser, setNU]     = useState({ nome: "", login: "", senha: "", role: "funcionario" });
  const [msgEmp, setMsgEmp]   = useState("");
  const [msgUsr, setMsgUsr]   = useState("");
  const [msgBkp, setMsgBkp]   = useState("");
  const [minhaSenha, setMS]   = useState({ atual: "", nova: "", confirmar: "" });
  const [msgSenha, setMsgSenha] = useState("");

  const ultimoBkp = db.getOne("config").ultimoBackup;

  const salvarEmpresa = () => {
    db.set("empresa", empresa);
    setMsgEmp("✅ Salvo!"); setTimeout(() => setMsgEmp(""), 2500);
  };

  const criarUser = () => {
    if (!novoUser.nome || !novoUser.login || !novoUser.senha) { alert("Preencha todos os campos."); return; }
    if (usuarios.find(u => u.login === novoUser.login)) { alert("Login já existe."); return; }
    const u = [...usuarios, { id: uid(), ...novoUser, senha: hashSenha(novoUser.senha), criadoEm: hoje() }];
    db.set("usuarios", u); setUsuarios(u);
    setNU({ nome: "", login: "", senha: "", role: "funcionario" });
    setMsgUsr("✅ Usuário criado!"); setTimeout(() => setMsgUsr(""), 2500);
  };

  const excluirUser = id => {
    if (id === "admin-master") { alert("Não é possível excluir o admin principal."); return; }
    if (!confirm("Excluir usuário?")) return;
    const u = db.get("usuarios").filter(x => x.id !== id);
    db.set("usuarios", u); setUsuarios(u);
  };

  const alterarSenha = () => {
    if (!minhaSenha.atual || !minhaSenha.nova) { setMsgSenha("❌ Preencha todos os campos."); return; }
    if (minhaSenha.nova !== minhaSenha.confirmar) { setMsgSenha("❌ Senhas não coincidem."); return; }
    const all = db.get("usuarios");
    const user = all.find(u => u.id === usuario.id);
    if (!user || user.senha !== hashSenha(minhaSenha.atual)) { setMsgSenha("❌ Senha atual incorreta."); return; }
    db.set("usuarios", all.map(u => u.id === usuario.id ? { ...u, senha: hashSenha(minhaSenha.nova) } : u));
    setMS({ atual: "", nova: "", confirmar: "" });
    setMsgSenha("✅ Senha alterada!"); setTimeout(() => setMsgSenha(""), 3000);
  };

  const exportarBkp = () => {
    const data = {
      versao: "2.0", exportadoEm: new Date().toISOString(),
      clientes: db.get("clientes"), produtos: db.get("produtos"),
      orcamentos: db.get("orcamentos"), vendas: db.get("vendas"),
      usuarios: db.get("usuarios"), empresa: db.getOne("empresa"),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `backup-oficina-${hoje()}.json`; a.click();
    URL.revokeObjectURL(url);
    db.set("config", { ultimoBackup: new Date().toLocaleString("pt-BR") });
    setMsgBkp("✅ Backup exportado com sucesso!"); setTimeout(() => setMsgBkp(""), 3000);
  };

  const importarBkp = e => {
    const file = e.target.files[0]; if (!file) return;
    if (!confirm("⚠️ ATENÇÃO: Isso vai substituir TODOS os dados atuais. Confirmar?")) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.clientes)   db.set("clientes", data.clientes);
        if (data.produtos)   db.set("produtos", data.produtos);
        if (data.orcamentos) db.set("orcamentos", data.orcamentos);
        if (data.vendas)     db.set("vendas", data.vendas);
        if (data.usuarios)   db.set("usuarios", data.usuarios);
        if (data.empresa)    db.set("empresa", data.empresa);
        setMsgBkp("✅ Backup restaurado! Recarregue a página."); 
        setUsuarios(db.get("usuarios")); setEmpresa(db.getOne("empresa"));
      } catch { setMsgBkp("❌ Arquivo inválido ou corrompido."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const ABAS = [
    ["empresa", "🏢", "Empresa"],
    ["usuarios", "👥", "Usuários"],
    ["senha",    "🔑", "Senha"],
    ["backup",   "💾", "Backup"],
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: NAV_H + 16 }}>
      <TopBar title="⚙️ Configurações" />

      {/* Abas */}
      <div style={{ display: "flex", overflowX: "auto", background: C.card, borderBottom: `1px solid ${C.border}`, scrollbarWidth: "none" }}>
        {ABAS.map(([id, icon, label]) => (
          <button key={id} onClick={() => setAba(id)} style={{
            flexShrink: 0, padding: "13px 16px", fontWeight: 700, fontSize: 13,
            background: "transparent", color: aba === id ? C.accent : C.muted,
            borderBottom: aba === id ? `2px solid ${C.accent}` : "2px solid transparent",
            whiteSpace: "nowrap",
          }}>{icon} {label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {/* EMPRESA */}
        {aba === "empresa" && (
          <Card>
            <div style={{ fontWeight: 800, marginBottom: 16 }}>🏢 Dados da Oficina</div>
            <Field label="Nome da Oficina" value={empresa.nome || ""}
              onChange={e => setEmpresa({ ...empresa, nome: e.target.value })} placeholder="Ex: Auto Mecânica Silva" />
            <Field label="Especialidade / Ramo" value={empresa.ramo || ""}
              onChange={e => setEmpresa({ ...empresa, ramo: e.target.value })} placeholder="Ex: Mecânica Geral e Elétrica" />
            <Field label="CNPJ / CPF" value={empresa.cnpj || ""}
              onChange={e => setEmpresa({ ...empresa, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
            <Field label="Telefone / WhatsApp" value={empresa.telefone || ""}
              onChange={e => setEmpresa({ ...empresa, telefone: e.target.value })} placeholder="(99) 99999-9999" type="tel" />
            <Field label="Endereço" value={empresa.endereco || ""}
              onChange={e => setEmpresa({ ...empresa, endereco: e.target.value })} placeholder="Rua, número, bairro" />
            <Field label="Cidade / Estado" value={empresa.cidade || ""}
              onChange={e => setEmpresa({ ...empresa, cidade: e.target.value })} placeholder="Belo Horizonte - MG" />
            <Btn onClick={salvarEmpresa} style={{ width: "100%" }}>💾 Salvar Dados</Btn>
            {msgEmp && <div style={{ color: C.green, fontWeight: 700, marginTop: 10, textAlign: "center" }}>{msgEmp}</div>}
          </Card>
        )}

        {/* USUÁRIOS */}
        {aba === "usuarios" && (
          <>
            <Card style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 14 }}>➕ Novo Usuário</div>
              <Field label="Nome" value={novoUser.nome}
                onChange={e => setNU({ ...novoUser, nome: e.target.value })} placeholder="Nome completo" />
              <Field label="Login" value={novoUser.login}
                onChange={e => setNU({ ...novoUser, login: e.target.value })} placeholder="Login único (sem espaços)" />
              <Field label="Senha inicial" type="password" value={novoUser.senha}
                onChange={e => setNU({ ...novoUser, senha: e.target.value })} placeholder="Senha inicial" />
              <div style={{ marginBottom: 14 }}>
                <Lbl>Perfil</Lbl>
                <select value={novoUser.role} onChange={e => setNU({ ...novoUser, role: e.target.value })}>
                  <option value="funcionario">Funcionário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <Btn onClick={criarUser} style={{ width: "100%" }}>✅ Criar Usuário</Btn>
              {msgUsr && <div style={{ color: C.green, fontWeight: 700, marginTop: 8, textAlign: "center" }}>{msgUsr}</div>}
            </Card>

            <Card>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>👤 Usuários ({usuarios.length})</div>
              {usuarios.map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{u.nome}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>@{u.login}</div>
                  </div>
                  <Badge color={u.role === "admin" ? C.gold : C.blue}>
                    {u.role === "admin" ? "👑 Admin" : "👤 Func."}
                  </Badge>
                  {u.id !== "admin-master" && (
                    <button onClick={() => excluirUser(u.id)}
                      style={{ background: C.red + "22", color: C.red, borderRadius: 8, padding: "6px 10px", fontWeight: 900, fontSize: 16, minWidth: 36, minHeight: 36 }}>×</button>
                  )}
                </div>
              ))}
            </Card>
          </>
        )}

        {/* SENHA */}
        {aba === "senha" && (
          <Card>
            <div style={{ fontWeight: 800, marginBottom: 16 }}>🔑 Alterar Minha Senha</div>
            <Field label="Senha atual" type="password" value={minhaSenha.atual}
              onChange={e => setMS({ ...minhaSenha, atual: e.target.value })} placeholder="Senha atual" />
            <Field label="Nova senha" type="password" value={minhaSenha.nova}
              onChange={e => setMS({ ...minhaSenha, nova: e.target.value })} placeholder="Nova senha" />
            <Field label="Confirmar nova senha" type="password" value={minhaSenha.confirmar}
              onChange={e => setMS({ ...minhaSenha, confirmar: e.target.value })} placeholder="Repita a nova senha" />
            <Btn onClick={alterarSenha} style={{ width: "100%" }}>🔑 Alterar Senha</Btn>
            {msgSenha && (
              <div style={{ color: msgSenha.includes("✅") ? C.green : C.red, fontWeight: 700, marginTop: 10, textAlign: "center" }}>{msgSenha}</div>
            )}
            <div style={{ color: C.muted, fontSize: 12, marginTop: 16, textAlign: "center" }}>
              Senha padrão inicial: <b style={{ color: C.text }}>admin123</b>
            </div>
          </Card>
        )}

        {/* BACKUP */}
        {aba === "backup" && (
          <>
            <Card style={{ marginBottom: 12, borderColor: ultimoBkp ? C.green + "55" : C.red + "55" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 40 }}>{ultimoBkp ? "✅" : "⚠️"}</div>
                <div>
                  <div style={{ fontWeight: 800 }}>{ultimoBkp ? "Backup realizado" : "Nenhum backup feito ainda!"}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                    {ultimoBkp ? `Último: ${ultimoBkp}` : "Faça um backup agora para proteger seus dados"}
                  </div>
                </div>
              </div>
            </Card>

            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>📤 Exportar Backup</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
                Salva todos os dados (incluindo fotos) em um arquivo <b style={{ color: C.text }}>.json</b>.<br />
                Salve no Google Drive, e-mail ou pendrive.
              </div>

              {/* O que será salvo */}
              <div style={{ background: C.bg, borderRadius: 10, padding: 12, marginBottom: 14 }}>
                {[
                  ["👥", "Clientes",   db.get("clientes").length],
                  ["🔧", "Produtos",   db.get("produtos").length],
                  ["📋", "Orçamentos", db.get("orcamentos").length],
                  ["💰", "Vendas",     db.get("vendas").length],
                  ["👤", "Usuários",   db.get("usuarios").length],
                  ["🏢", "Empresa",    "✓"],
                ].map(([icon, label, count]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                    <span>{icon} {label}</span>
                    <span style={{ color: C.accent, fontWeight: 700 }}>{count}</span>
                  </div>
                ))}
              </div>

              <Btn onClick={exportarBkp} color={C.green} style={{ width: "100%" }}>
                📥 Baixar Arquivo de Backup
              </Btn>
            </Card>

            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>📂 Restaurar Backup</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
                ⚠️ <b style={{ color: C.red }}>Atenção:</b> restaurar um backup vai <b style={{ color: C.red }}>substituir todos os dados atuais</b>.
              </div>
              <label style={{ display: "block", background: C.blue, color: "#fff", borderRadius: 12, padding: 14, fontWeight: 700, fontSize: 15, textAlign: "center", cursor: "pointer" }}>
                📁 Selecionar Arquivo de Backup
                <input type="file" accept=".json" onChange={importarBkp} style={{ display: "none" }} />
              </label>
            </Card>

            {msgBkp && (
              <div style={{
                background: msgBkp.includes("✅") ? C.green + "22" : C.red + "22",
                border: `1px solid ${msgBkp.includes("✅") ? C.green : C.red}`,
                borderRadius: 12, padding: 14,
                color: msgBkp.includes("✅") ? C.green : C.red,
                fontWeight: 700, textAlign: "center",
              }}>{msgBkp}</div>
            )}

            <Card style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>💡 Dicas de segurança</div>
              <div style={{ color: C.muted, fontSize: 13, lineHeight: 2 }}>
                🔁 Faça backup <b style={{ color: C.text }}>toda semana</b><br />
                ☁️ Salve no <b style={{ color: C.text }}>Google Drive</b> ou <b style={{ color: C.text }}>e-mail</b><br />
                💾 Guarde no <b style={{ color: C.text }}>WhatsApp para você mesmo</b><br />
                📱 Se trocar de celular, use o arquivo para restaurar tudo<br />
                📸 As fotos dos clientes ficam salvas no backup
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario]       = useState(null);
  const [screen, setScreen]         = useState("menu");
  const [editOrcamento, setEditOrc] = useState(null);

  useEffect(() => {
    inicializarAdmin();

    // CSS mobile-first
    const el = document.createElement("style");
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      html,body{
        background:#0f1923;color:#e8edf2;
        font-family:'Nunito',sans-serif;min-height:100vh;
        overscroll-behavior:none;
        -webkit-text-size-adjust:100%;
      }
      input,select,textarea{
        background:#0d1720;border:1.5px solid #1e3048;border-radius:10px;
        color:#e8edf2;font-family:'Nunito',sans-serif;
        font-size:16px;padding:12px 14px;width:100%;
        outline:none;transition:border-color .2s;
        -webkit-appearance:none;appearance:none;
      }
      input:focus,select:focus,textarea:focus{border-color:#f97316}
      input::placeholder,textarea::placeholder{color:#6b8099}
      button{cursor:pointer;font-family:'Nunito',sans-serif;border:none;outline:none;-webkit-tap-highlight-color:transparent}
      select{
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b8099' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
        background-repeat:no-repeat;background-position:right 12px center;background-size:12px;padding-right:36px;
      }
      input[type="date"]{color:#e8edf2}
      input[type="number"]{-moz-appearance:textfield}
      input[type="number"]::-webkit-outer-spin-button,
      input[type="number"]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:#1e3048;border-radius:4px}
      @media print{.no-print{display:none!important}}
    `;
    document.head.appendChild(el);

    // Meta viewport seguro para Android
    let meta = document.querySelector("meta[name=viewport]");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.content = "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover";

    // PWA meta tags
    let themeColor = document.querySelector("meta[name=theme-color]");
    if (!themeColor) {
      themeColor = document.createElement("meta");
      themeColor.name = "theme-color";
      themeColor.content = "#0f1923";
      document.head.appendChild(themeColor);
    }

    return () => document.head.removeChild(el);
  }, []);

  const navigate = useCallback((s) => {
    if (s !== "orcamento") setEditOrc(null);
    setScreen(s); window.scrollTo(0, 0);
  }, []);

  const onLogin  = user => { setUsuario(user); setScreen("menu"); };
  const onLogout = () => { if (confirm("Deseja sair da conta?")) { setUsuario(null); setScreen("menu"); } };

  if (!usuario) return <LoginScreen onLogin={onLogin} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {screen === "menu"     && <HomeScreen     navigate={navigate} usuario={usuario} onLogout={onLogout} />}
      {screen === "clientes" && <ClientesScreen navigate={navigate} />}
      {screen === "produtos" && <ProdutosScreen navigate={navigate} />}
      {screen === "orcamento"&& <OrcamentoScreen navigate={navigate} usuario={usuario} editOrcamento={editOrcamento} />}
      {screen === "vendas"   && <VendasScreen   navigate={navigate} setEditOrcamento={setEditOrc} />}
      {screen === "config" && usuario.role === "admin" && <ConfigScreen navigate={navigate} usuario={usuario} />}

      <BottomNav screen={screen} navigate={navigate} isAdmin={usuario.role === "admin"} />
    </div>
  );
}
