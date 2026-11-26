const API_URL = "https://api.binance.com/api/v3/ticker/24hr";

let currentPage = 1;      // ★ 지금 보고 있는 페이지
const PAGE_SIZE = 20;
let priceChart = null;    // ★ 지금 그려진 그래프 (다시 그릴 때 지우려고)     // ★ 한 페이지에 보여줄 개수
let currency = "USD";   // ★ 지금 보는 화폐 ("USD" 또는 "KRW")
let krwRate = null;     // ★ 1달러 = 몇 원인지
let allTickers = [];        // ★ 받아온 전체 코인 목록 저장
let currentTab = "allTab";  // ★ 지금 선택된 탭 (처음엔 전체보기)
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];   // ★ 추가
let sortKey = null;    // ★ 어떤 칸으로 정렬 중인지 (처음엔 없음)
let sortAsc = false;   // ★ true면 작은 것부터(▲), false면 큰 것부터(▼)
// 1) 데이터 불러오기
async function loadTickers() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`서버 응답 에러: ${res.status}`);   // ★ 추가
    const data = await res.json();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    return data
        .filter((t) => t.symbol.endsWith("USDT") && t.count > 0 && t.closeTime > oneDayAgo)
        .map((t) => ({
            symbol: t.symbol,
            name: t.symbol.slice(0, -4),   // ★ 추가: "BTCUSDT" → "BTC"
            price: Number(t.lastPrice),
            changePercent: Number(t.priceChangePercent),
            high: Number(t.highPrice),   // ★ 추가
            low: Number(t.lowPrice),     // ★ 추가
            volume: Number(t.quoteVolume),
        }));
}
// 환율 불러오기 (페이지 열 때 한 번만)
async function loadRate() {
    
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        if (data.result !== "success") throw new Error("환율 API 에러");

        krwRate = data.rates.KRW;   // 예: 1385.2
    } catch (error) {
        console.error(error);
        document.getElementById("krwBtn").disabled = true;   // 실패하면 원화 버튼 끄기
    }
}
// 과거 가격 불러오기 (그래프용)
async function loadKlines(symbol, interval, limit) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`차트 데이터 에러: ${res.status}`);
    const data = await res.json();

    return data.map((k) => ({
        time: k[0],             // 시각
        close: Number(k[4]),    // 종가
    }));
}
// 가격: 화폐에 맞게 바꾸고 기호 붙이기
function formatPrice(usd) {
    if (currency === "KRW") {
        const krw = usd * krwRate;
        const digits = krw >= 100 ? 0 : 2;   // 원화는 100원 이상이면 소수점 없이
        return "₩" + krw.toLocaleString("ko-KR", { maximumFractionDigits: digits });
    }
    const digits = usd >= 1 ? 2 : 6;
    return "$" + usd.toLocaleString("en-US", { maximumFractionDigits: digits });
}

// 거래대금: 화폐에 맞게 바꾸고 조/억/만 단위로
function formatVolume(usd) {
    const value = currency === "KRW" ? usd * krwRate : usd;
    const symbol = currency === "KRW" ? "₩" : "$";

    if (value >= 1e12) return symbol + (value / 1e12).toFixed(1) + "조";
    if (value >= 1e8) return symbol + (value / 1e8).toFixed(1) + "억";
    if (value >= 1e4) return symbol + (value / 1e4).toFixed(1) + "만";
    return symbol + value.toFixed(0);
}

// 지금 탭에 맞는 목록 만들기
function getTabList() {
    const list = [...allTickers];   // 원본을 망가뜨리지 않게 복사
    if (currentTab === "favoritesTab") {
        return list.filter((t) => favorites.includes(t.symbol));   // ★인 코인만
    }
    if (currentTab === "gainersTab") {
        return list.sort((a, b) => b.changePercent - a.changePercent).slice(0, 30);
    }
    if (currentTab === "losersTab") {
        return list.sort((a, b) => a.changePercent - b.changePercent).slice(0, 30);
    }
    if (currentTab === "volumeTab") {
        return list.sort((a, b) => b.volume - a.volume).slice(0, 30);
    }
    return list;   // 전체보기
}

// 페이지 버튼 그리기
function renderPagination(totalPages) {
    // 지금 페이지 주변으로 최대 5개만 보여주기 (예: 3 4 [5] 6 7)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    startPage = Math.max(1, endPage - 4);

    let html = `<button data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>이전</button>`;

    for (let p = startPage; p <= endPage; p++) {
        html += `<button data-page="${p}" class="${p === currentPage ? "active" : ""}">${p}</button>`;
    }

    html += `<button data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}>다음</button>`;

    document.getElementById("pagination").innerHTML = html;
}
// 2) 표에 그리기  ★ 새로 추가
function render(list) {
    const tbody = document.getElementById("cryptocurrencyList");
    // 검색어로 거르기
    const keyword = document.getElementById("searchInput").value.trim().toUpperCase().replace("USDT", "");
    if (keyword) {
        list = list.filter((t) => t.name.includes(keyword));
    }
    // 표 머리로 정렬한 게 있으면 적용
    if (sortKey) {
        list.sort((a, b) => {
            const x = a[sortKey];
            const y = b[sortKey];
            const result = typeof x === "string" ? x.localeCompare(y) : x - y;
            return sortAsc ? result : -result;
        });
    }

    // 정렬 중인 칸에 ▲▼ 표시
    document.querySelectorAll("th.sortable").forEach((th) => {
        th.classList.remove("asc", "desc");
        if (th.dataset.sort === sortKey) {
            th.classList.add(sortAsc ? "asc" : "desc");
        }
    });
    // 페이지 나누기
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageList = list.slice(start, start + PAGE_SIZE);

    renderPagination(totalPages);

    tbody.innerHTML = pageList.map((t) => {
        // 0보다 크면 "up", 작으면 "down", 0이면 ""
        let changeClass = "";
        if (t.changePercent > 0) changeClass = "up";
        if (t.changePercent < 0) changeClass = "down";

        return `
            <tr data-symbol="${t.symbol}">
                <td><button class="fav-btn" data-symbol="${t.symbol}">${favorites.includes(t.symbol) ? "★" : "☆"}</button></td>
                                <td class="symbol">${t.name}<span class="pair">/USDT</span></td>
                <td>${formatPrice(t.price)}</td>
                <td class="${changeClass}">${t.changePercent.toFixed(2)}%</td>
                <td>${formatPrice(t.high)}</td>
                <td>${formatPrice(t.low)}</td>
                <td>${formatVolume(t.volume)}</td>
            </tr>
        `;
    }).join("");
}

// 3) 시작  ★ console.table 대신 화면에 그리기
async function main() {
    try {
        allTickers = await loadTickers();

        document.getElementById("loading").classList.add("hidden");
        document.getElementById("loading").classList.remove("error");   // ★ ③ 여기
        document.getElementById("cryptoTable").classList.remove("hidden");

        render(getTabList());  

        const now = new Date().toLocaleTimeString("ko-KR");
        document.getElementById("lastUpdated").textContent = `마지막 업데이트: ${now}`;
    } catch (error) {
        console.error(error);

        const loading = document.getElementById("loading");
        loading.textContent = "데이터를 불러오지 못했습니다. 잠시 후 자동으로 다시 시도합니다.";
        loading.classList.remove("hidden");
        loading.classList.add("error");
    }
}

// 탭 버튼 클릭
const tabButtons = document.querySelectorAll(".tab-btn");

tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        tabButtons.forEach((b) => b.classList.remove("active"));  // 모든 탭에서 active 빼기
        btn.classList.add("active");                              // 누른 탭에만 active
        currentTab = btn.id;
        sortKey = null;   
        currentPage = 1;     // ★ 추가                                     // 어떤 탭인지 기억
        render(getTabList());                                     // 다시 그리기
    });
});

// 달러/원화 전환
function setCurrency(newCurrency) {
    currency = newCurrency;

    document.getElementById("usdBtn").classList.toggle("active", currency === "USD");
    document.getElementById("krwBtn").classList.toggle("active", currency === "KRW");

    document.querySelectorAll(".unit").forEach((span) => {
        span.textContent = currency;   // 표 머리 단위 바꾸기
    });

    render(getTabList());
}

document.getElementById("usdBtn").addEventListener("click", () => setCurrency("USD"));
document.getElementById("krwBtn").addEventListener("click", () => setCurrency("KRW"));

// 관심 ☆/★ 클릭
const tbody = document.getElementById("cryptocurrencyList");

tbody.addEventListener("click", (event) => {
    if (!event.target.classList.contains("fav-btn")) return;   // 별 버튼이 아니면 무시

    const symbol = event.target.dataset.symbol;                // 어떤 코인인지 읽기

    if (favorites.includes(symbol)) {
        favorites = favorites.filter((s) => s !== symbol);     // 이미 있으면 빼기
    } else {
        favorites.push(symbol);                                // 없으면 넣기
    }

    localStorage.setItem("favorites", JSON.stringify(favorites));   // 저장
    render(getTabList());                                           // 다시 그리기
});
// 표 머리 클릭 정렬
document.querySelectorAll("th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
        const key = th.dataset.sort;

        if (sortKey === key) {
            sortAsc = !sortAsc;        // 같은 칸을 또 누르면 방향만 뒤집기
        } else {
            sortKey = key;             // 다른 칸을 누르면 그 칸으로
            sortAsc = key === "name"; // 심볼은 A→Z, 숫자는 큰 것부터
        }
        currentPage = 1;
        render(getTabList());
    });
});
loadRate();   
// 다크 모드
const themeBtn = document.getElementById("themeBtn");

function applyTheme(isDark) {
    document.body.classList.toggle("dark", isDark);
    themeBtn.textContent = isDark ? "☀️ 라이트 모드" : "🌙 다크 모드";
    localStorage.setItem("theme", isDark ? "dark" : "light");
}

themeBtn.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark");   // 지금 반대로
    applyTheme(isDark);
});

// 처음 열 때: 저장된 설정 → 없으면 맥/윈도우 시스템 설정 따라가기
const savedTheme = localStorage.getItem("theme");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(savedTheme ? savedTheme === "dark" : systemDark);                 // ★ 추가: 환율은 한 번만
// 페이지 버튼 클릭
document.getElementById("pagination").addEventListener("click", (event) => {
    const page = event.target.dataset.page;
    if (!page || event.target.disabled) return;

    currentPage = Number(page);
    render(getTabList());
    window.scrollTo({ top: 0, behavior: "smooth" });   // 맨 위로 부드럽게 스크롤
});
// 그래프 팝업 열고 닫기
const chartModal = document.getElementById("chartModal");
// 그래프 그리기
function drawChart(klines) {
    const chartArea = document.getElementById("chartArea");
    chartArea.innerHTML = '<canvas id="priceChart"></canvas>';   // 그림판 만들기

    // 기간 동안 올랐으면 빨강, 내렸으면 파랑 (CSS 변수에서 색 가져오기)
    const first = klines[0].close;
    const last = klines[klines.length - 1].close;
    const styles = getComputedStyle(document.body);
    const color = styles.getPropertyValue(last >= first ? "--up" : "--down").trim();

    // 가로축 날짜 글자, 세로축 가격
    const labels = klines.map((k) => {
        const d = new Date(k.time);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const prices = klines.map((k) => k.close);

    if (priceChart) priceChart.destroy();   // 전에 그린 그래프가 있으면 지우기

    priceChart = new Chart(document.getElementById("priceChart"), {
        type: "line",   // 꺾은선 그래프
        data: {
            labels: labels,
            datasets: [{
                data: prices,
                borderColor: color,
                borderWidth: 2,
                pointRadius: 0,   // 점 안 찍고 선만
                tension: 0.2,     // 선을 살짝 부드럽게
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,   // 상자 크기(360px)에 맞추기
            plugins: {
                legend: { display: false },   // 범례 숨기기
                tooltip: {
                    callbacks: {
                        label: (ctx) => formatPrice(ctx.parsed.y),   // 마우스 올리면 $60,677.86
                    },
                },
            },
            scales: {
                y: {
                    ticks: { callback: (value) => formatPrice(value) },   // 세로축 숫자도 $ 형식
                },
            },
        },
    });
}
async function openModal(symbol) {
    document.getElementById("modalTitle").textContent = symbol.slice(0, -4) + " / USDT";
    chartModal.classList.remove("hidden");

    const chartArea = document.getElementById("chartArea");
    chartArea.textContent = "그래프 데이터를 불러오는 중...";

    try {
        const klines = await loadKlines(symbol, "1d", 30);   // 최근 30일, 하루 단위
                drawChart(klines);
    } catch (error) {
        console.error(error);
        chartArea.textContent = "그래프 데이터를 불러오지 못했습니다.";
    }
}

function closeModal() {
    chartModal.classList.add("hidden");
}

// 표의 줄 클릭 → 팝업 열기
document.getElementById("cryptocurrencyList").addEventListener("click", (event) => {
    if (event.target.classList.contains("fav-btn")) return;   // 별 누른 건 무시

    const row = event.target.closest("tr");                    // 클릭한 곳이 속한 줄 찾기
    if (!row || !row.dataset.symbol) return;

    openModal(row.dataset.symbol);
});

// ✕ 버튼 → 닫기
document.getElementById("closeModalBtn").addEventListener("click", closeModal);

// 어두운 배경 클릭 → 닫기
chartModal.addEventListener("click", (event) => {
    if (event.target === chartModal) closeModal();
});

// Esc 키 → 닫기
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
});
// 검색창에 글자를 칠 때마다 다시 그리기
document.getElementById("searchInput").addEventListener("input", () => {
    currentPage = 1;
    render(getTabList());
});
main();                  // 처음 한 번 바로 실행
setInterval(main, 10000);      // ★ 그다음부터 10초마다 다시 실행