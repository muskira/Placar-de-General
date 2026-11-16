// ===== CONFIGURAÇÃO DAS REGRAS (altere aqui se mudar a versão do jogo) =====
const MAX_PLAYERS = 10;
const MAO_BONUS = 5;
const LUVA = "🧤";
const ROWS = [
    { label: "1", name: "Ás",            max: 5 },
    { label: "2", name: "Duque",         max: 10 },
    { label: "3", name: "Terno",         max: 15 },
    { label: "4", name: "Quadra num.",   max: 20 },
    { label: "5", name: "Quina",         max: 25 },
    { label: "6", name: "Sena",          max: 30 },
    { label: "F", name: "Fula",          fixed: 30 },
    { label: "S", name: "Sequência",     fixed: 25 },
    { label: "Q", name: "Quadra",        fixed: 40 },
    { label: "G", name: "General",       fixed: 50 },
    { label: "G", name: "General 2",     fixed: 50 },
];
const UPPER = 6; // linhas 0-5 = parte superior

// ===== ESTADO =====
const STORAGE_KEY = "placar-general-v1";
let state = load() || newState();

function newState(n = 3) {
    return {
        n,
        names: Array.from({ length: MAX_PLAYERS }, (_, i) => `Jogador ${String(i + 1).padStart(2, "0")}`),
        score: Array.from({ length: MAX_PLAYERS }, () => Array(ROWS.length).fill(null)),
        mao: Array.from({ length: MAX_PLAYERS }, () => Array(ROWS.length).fill(false)),
    };
}
function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// ===== CÁLCULOS =====
const total = p => state.score[p].reduce((s, v) => s + (v ?? 0), 0);

function ranking() {
    const ord = Array.from({ length: state.n }, (_, i) => i).sort((a, b) => total(b) - total(a));
    let pos = 0;
    return ord.map((p, i) => {
        if (i === 0 || total(p) !== total(ord[i - 1])) pos = i + 1;
        return { player: p, pos, pts: total(p) };
    });
}
function winnerText() {
    const rk = ranking();
    const best = rk[0].pts;
    const w = rk.filter(r => r.pts === best).map(r => state.names[r.player]);
    return `${w.length > 1 ? "Empate entre" : "Vencedor"}: ${w.join(", ")} (${best} pts)`;
}

// ===== RENDER =====
const $ = id => document.getElementById(id);

function render() {
    const n = state.n;
    const col = p => (p % 2 === 0 ? "col-odd" : "");
    let h = "<tr><th></th>";
    for (let p = 0; p < n; p++)
        h += `<th class="player ${col(p)}"><button data-rename="${p}">${esc(state.names[p])}</button></th>`;
    h += "</tr>";

    ROWS.forEach((row, r) => {
        const hint = row.fixed
            ? `<small>${row.name} · ${row.fixed}</small>`
            : `<small>até ${row.max}</small>`;
        h += `<tr><td class="label"><b>${row.label}</b>${hint}</td>`;
        for (let p = 0; p < n; p++) {
            const v = state.score[p][r];
            const cls = v === null ? "" : v === 0 ? "zero" : "filled";
            const txt = v === null ? "" : (state.mao[p][r] ? LUVA + " " : "") + v;
            h += `<td class="cell ${cls} ${col(p)}"><button data-p="${p}" data-r="${r}">${txt}</button></td>`;
        }
        h += "</tr>";
    });

    h += `<tr class="total"><td class="label">Total</td>`;
    for (let p = 0; p < n; p++) h += `<td class="sum">${total(p)}</td>`;
    h += "</tr>";
    $("board").innerHTML = h;

    const rk = ranking();
    $("status").innerHTML =
        `<div class="winner">🏆 ${esc(winnerText())}</div><ol>` +
        rk.map(r => `<li>${r.pos}º — ${esc(state.names[r.player])}: <b>${r.pts}</b> pts</li>`).join("") +
        "</ol>";
    $("numPlayers").value = n;
    save();
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ===== INTERAÇÃO =====
$("board").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.rename !== undefined) return rename(+b.dataset.rename);
    if (b.dataset.p !== undefined) openDialog(+b.dataset.p, +b.dataset.r);
});

function rename(p) {
    const s = prompt(`Nome do jogador ${p + 1}:`, state.names[p]);
    if (s && s.trim()) { state.names[p] = s.trim(); render(); }
}

function setCell(p, r, value, mao = false) {
    state.score[p][r] = value;
    state.mao[p][r] = mao;
    render();
}

function openDialog(p, r) {
    const row = ROWS[r];
    const dlg = $("dlg");
    let html = `<h2>${esc(state.names[p])}</h2><p>${row.label} — ${row.name}</p>`;

    if (r < UPPER) {
        const f = r + 1;
        html += `<p>Soma dos dados com valor ${f} (máx. ${row.max})</p><div class="opts">`;
        for (let k = 0; k <= 5; k++) html += `<button data-v="${k * f}">${k * f}</button>`;
        html += `</div><div class="opts col1" style="margin-top:8px"><button data-clear="1">Limpar</button></div>`;
    } else {
        html += `<div class="opts col1">
      <button data-v="${row.fixed}">Feito (${row.fixed})</button>
      <button class="glove" data-v="${row.fixed + MAO_BONUS}" data-mao="1">${LUVA} Mão (${row.fixed + MAO_BONUS})</button>
      <button data-v="0">Riscar (0)</button>
      <button data-clear="1">Limpar</button></div>`;
    }
    html += `<button class="cancel" data-cancel="1">Cancelar</button>`;
    dlg.innerHTML = html;

    dlg.onclick = e => {
        const b = e.target.closest("button");
        if (!b) return;
        dlg.close();
        if (b.dataset.cancel) return;
        if (b.dataset.clear) return setCell(p, r, null);
        setCell(p, r, +b.dataset.v, !!b.dataset.mao);
    };
    dlg.showModal();
}

// seletor de jogadores
for (let i = 1; i <= MAX_PLAYERS; i++) $("numPlayers").add(new Option(i, i));
$("numPlayers").addEventListener("change", e => { state.n = +e.target.value; render(); });

$("btnReset").addEventListener("click", () => {
    if (!confirm("Zerar todo o placar? (os nomes são mantidos)")) return;
    state.score = newState().score;
    state.mao = newState().mao;
    render();
});

$("btnResult").addEventListener("click", () => {
    const lines = ranking().map(r => `${r.pos}º  ${state.names[r.player]}  —  ${r.pts} pts`);
    alert(`${winnerText()}\n\nClassificação:\n${lines.join("\n")}`);
});

// ===== EXPORTAÇÃO =====
function download(filename, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const cellText = (p, r) => {
    const v = state.score[p][r];
    return v === null ? "-" : v + (state.mao[p][r] ? "*" : "");
};

$("btnTxt").addEventListener("click", () => {
    const n = state.n;
    const pad = (s, w) => String(s).slice(0, w - 1).padEnd(w);
    let t = "PLACAR GENERAL\n\n" + pad("", 22);
    for (let p = 0; p < n; p++) t += pad(state.names[p], 14);
    t += "\n";
    ROWS.forEach((row, r) => {
        t += pad(`${row.label} (${row.name})`, 22);
        for (let p = 0; p < n; p++) t += pad(cellText(p, r), 14);
        t += "\n";
    });
    t += pad("TOTAL", 22);
    for (let p = 0; p < n; p++) t += pad(total(p), 14);
    t += `\n\n(* = jogada de mão, +${MAO_BONUS})\n\n${winnerText()}\n\nClassificação:\n`;
    t += ranking().map(r => `${r.pos}º  ${pad(state.names[r.player], 20)} ${r.pts} pts`).join("\n");
    download("placar_general.txt", new Blob([t], { type: "text/plain;charset=utf-8" }));
});

$("btnXlsx").addEventListener("click", () => {
    if (typeof XLSX === "undefined") {
        alert("Biblioteca do Excel não carregou (verifique a internet). Use o TXT por enquanto.");
        return;
    }
    const n = state.n;
    const names = state.names.slice(0, n);
    const aoa = [["", ...names]];
    ROWS.forEach((row, r) => {
        aoa.push([`${row.label} (${row.name})`, ...names.map((_, p) => state.score[p][r])]);
    });
    const lastRow = ROWS.length + 1;
    const totals = ["TOTAL"];
    for (let p = 0; p < n; p++) {
        const colL = XLSX.utils.encode_col(p + 1);
        totals.push({ t: "n", f: `SUM(${colL}2:${colL}${lastRow})`, v: total(p) });
    }
    aoa.push(totals);
    aoa.push([]);
    aoa.push(["Jogadas de mão (+" + MAO_BONUS + ")", ...names.map((_, p) => state.mao[p].filter(Boolean).length)]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 24 }, ...names.map(() => ({ wch: 16 }))];

    const rk = ranking();
    const ws2 = XLSX.utils.aoa_to_sheet([
        ["Posição", "Jogador", "Pontos"],
        ...rk.map(r => [r.pos, state.names[r.player], r.pts]),
        [],
        [winnerText()],
    ]);
    ws2["!cols"] = [{ wch: 10 }, { wch: 24 }, { wch: 10 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Placar");
    XLSX.utils.book_append_sheet(wb, ws2, "Classificação");
    XLSX.writeFile(wb, "placar_general.xlsx");
});

render();

// =====================================================================
//  CLASSIFICAÇÃO GERAL (histórico de partidas)
//  Guardado à parte; "Resetar" do placar NÃO apaga a classificação.
//  As estatísticas são calculadas pelo NOME do jogador.
// =====================================================================
const HISTORY_KEY = "placar-general-history-v1";
let history = loadHistory();

function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}
function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
}

/** Soma vitórias / partidas / pontos de cada jogador e ordena. */
function stats() {
    const map = new Map();
    history.forEach(g => g.results.forEach(r => {
        const key = r.name.trim().toLowerCase();
        const s = map.get(key) || { name: r.name, wins: 0, games: 0, points: 0 };
        s.name = r.name;
        s.games++;
        s.points += r.pts;
        if (r.pos === 1) s.wins++;        // empate no 1º lugar = vitória para todos os empatados
        map.set(key, s);
    }));
    const list = [...map.values()].sort(
        (a, b) => b.wins - a.wins || b.points - a.points || a.name.localeCompare(b.name));
    let pos = 0;
    list.forEach((s, i) => {
        if (i === 0 || s.wins !== list[i - 1].wins || s.points !== list[i - 1].points) pos = i + 1;
        s.pos = pos;
        s.avg = s.games ? Math.round(s.points / s.games) : 0;
    });
    return list;
}

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

function renderRank() {
    const list = stats();
    let h = `<tr><th>Pos.</th><th>Jogador</th><th>Vitórias</th><th>Partidas</th><th>Pontos</th><th>Média</th></tr>`;
    if (!list.length) {
        h += `<tr><td class="empty" colspan="6">Nenhuma partida registrada ainda.<br>
          Use “Encerrar partida” na aba Placar.</td></tr>`;
    } else {
        list.forEach(s => {
            h += `<tr class="${s.pos === 1 ? "leader" : ""}">
        <td class="pos">${MEDAL[s.pos] || ""} ${s.pos}º</td>
        <td class="name">${esc(s.name)}</td>
        <td class="wins">${s.wins}</td>
        <td>${s.games}</td>
        <td>${s.points}</td>
        <td>${s.avg}</td></tr>`;
        });
    }
    $("rankTable").innerHTML = h;

    const last = history[history.length - 1];
    $("rankInfo").innerHTML = history.length
        ? `<div class="winner">${history.length} partida(s) registrada(s)</div>
       <div>Última: ${new Date(last.date).toLocaleString("pt-BR")}</div>
       <div style="opacity:.7;font-size:.85rem;margin-top:4px">Ordem: vitórias, depois pontos totais.</div>`
        : "";
}

// ----- alternar entre as abas -----
function showView(v) {
    const rank = v === "rank";
    $("viewGame").hidden = rank;
    $("gameTools").hidden = rank;
    $("viewRank").hidden = !rank;
    $("rankTools").hidden = !rank;
    document.querySelectorAll(".tabs button").forEach(b =>
        b.classList.toggle("active", b.dataset.view === v));
    if (rank) renderRank();
}
document.querySelectorAll(".tabs button").forEach(b =>
    b.addEventListener("click", () => showView(b.dataset.view)));

// ----- encerrar partida: registra vitórias e zera o placar -----
$("btnFinish").addEventListener("click", () => {
    const empty = state.score.slice(0, state.n).flat().filter(v => v === null).length;
    if (empty > 0 && !confirm(`Ainda há ${empty} casa(s) vazia(s). Encerrar mesmo assim?`)) return;
    if (!confirm(`${winnerText()}\n\nRegistrar esta partida na classificação e zerar o placar?`)) return;

    history.push({
        date: new Date().toISOString(),
        results: ranking().map(r => ({ name: state.names[r.player], pts: r.pts, pos: r.pos })),
    });
    saveHistory();
    state.score = newState().score;
    state.mao = newState().mao;
    render();
    showView("rank");
});

$("btnUndo").addEventListener("click", () => {
    if (!history.length) return alert("Não há partidas para desfazer.");
    if (!confirm("Remover a última partida registrada da classificação?")) return;
    history.pop();
    saveHistory();
    renderRank();
});

$("btnRankReset").addEventListener("click", () => {
    if (!history.length) return;
    if (!confirm("Apagar TODA a classificação e o histórico de partidas? Isso não pode ser desfeito.")) return;
    history = [];
    saveHistory();
    renderRank();
});

// ----- exportação da classificação 2026 -----
$("btnRankTxt").addEventListener("click", () => {
    const list = stats();
    const pad = (s, w) => String(s).slice(0, w - 1).padEnd(w);
    let t = "CLASSIFICAÇÃO GERAL - GENERAL\n\n";
    t += pad("Pos", 6) + pad("Jogador", 22) + pad("Vitórias", 10) + pad("Partidas", 10) + pad("Pontos", 9) + "Média\n";
    list.forEach(s => {
        t += pad(s.pos + "º", 6) + pad(s.name, 22) + pad(s.wins, 10) + pad(s.games, 10) + pad(s.points, 9) + s.avg + "\n";
    });
    t += `\nPartidas registradas: ${history.length}\n`;
    download("classificacao_general.txt", new Blob([t], { type: "text/plain;charset=utf-8" }));
});

$("btnRankXlsx").addEventListener("click", () => {
    if (typeof XLSX === "undefined") {
        alert("Biblioteca do Excel não carregou (verifique a internet). Use o TXT por enquanto.");
        return;
    }
    const ws = XLSX.utils.aoa_to_sheet([
        ["Posição", "Jogador", "Vitórias", "Partidas", "Pontos", "Média"],
        ...stats().map(s => [s.pos, s.name, s.wins, s.games, s.points, s.avg]),
    ]);
    ws["!cols"] = [{ wch: 10 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];

    const hist = [["Partida", "Data", "Jogador", "Posição", "Pontos"]];
    history.forEach((g, i) => g.results.forEach(r =>
        hist.push([i + 1, new Date(g.date).toLocaleString("pt-BR"), r.name, r.pos, r.pts])));
    const ws2 = XLSX.utils.aoa_to_sheet(hist);
    ws2["!cols"] = [{ wch: 9 }, { wch: 20 }, { wch: 24 }, { wch: 10 }, { wch: 10 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classificação");
    XLSX.utils.book_append_sheet(wb, ws2, "Histórico de partidas");
    XLSX.writeFile(wb, "classificacao_general.xlsx");
});