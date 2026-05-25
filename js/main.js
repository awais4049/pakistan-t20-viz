// ============================================================
// Pakistan T20 World Cup Analytics — main.js
// DSC327 Data Visualization Project
// ============================================================

// ── TOOLTIP HELPER ──────────────────────────────────────────
const tooltip = d3.select("#tooltip");

function showTooltip(html, event) {
  tooltip.html(html)
    .classed("visible", true)
    .style("left", (event.clientX + 14) + "px")
    .style("top",  (event.clientY - 10) + "px");
}

function moveTooltip(event) {
  tooltip
    .style("left", (event.clientX + 14) + "px")
    .style("top",  (event.clientY - 10) + "px");
}

function hideTooltip() {
  tooltip.classed("visible", false);
}

// ── RESPONSIVE WIDTH HELPER ──────────────────────────────────
function getWidth(selector) {
  return document.querySelector(selector).clientWidth || 600;
}

// ── LOAD ALL DATA ────────────────────────────────────────────
Promise.all([
  d3.json("data/matches_clean.json"),
  d3.json("data/top_batsmen.json"),
  d3.json("data/top_bowlers.json"),
  d3.json("data/over_by_over.json"),
  d3.json("data/win_by_opponent.json"),
  d3.json("data/pakistan_batting.json"),
  d3.json("data/pakistan_bowling.json"),
]).then(([matches, topBatsmen, topBowlers, overData, winOpponent, batting, bowling]) => {

  // ── HERO STATS ─────────────────────────────────────────────
  const wins   = matches.filter(d => d.Pakistan_Result === "Win").length;
  const losses = matches.filter(d => d.Pakistan_Result === "Loss").length;
  const ties   = matches.filter(d => d.Pakistan_Result === "Tie").length;
  const total  = matches.length;
  const winPct = ((wins / total) * 100).toFixed(0) + "%";

  animateNumber("#total-matches", total);
  animateNumber("#total-wins",    wins);
  animateNumber("#total-losses",  losses);
  document.querySelector("#win-pct").textContent = winPct;

  function animateNumber(sel, target) {
    let start = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      document.querySelector(sel).textContent = start;
      if (start >= target) clearInterval(timer);
    }, 30);
  }

  // ── CHART 1: Results by Year ───────────────────────────────
  drawResultsByYear(matches);

  // ── CHART 2: Batting Order Win Rate ───────────────────────
  drawBattingOrder(matches);

  // ── CHART 3: Score Scatter ────────────────────────────────
  drawScoreScatter(matches);

  // ── CHART 4: Top Batsmen ──────────────────────────────────
  drawTopBatsmen(topBatsmen);

  // ── CHART 5: Runs vs Strike Rate Bubble ───────────────────
  drawBatBubble(topBatsmen);

  // ── CHART 6: Boundaries stacked bar ───────────────────────
  drawBoundaries(topBatsmen);

  // ── CHART 7: Top Bowlers ──────────────────────────────────
  drawTopBowlers(topBowlers);

  // ── CHART 8: Economy vs Wickets Scatter ───────────────────
  drawBowlScatter(topBowlers);

  // ── CHART 9: Bowling in Wins vs Losses ────────────────────
  drawBowlWinLoss(bowling);

  // ── CHART 10: Win Rate by Opponent ────────────────────────
  drawWinByOpponent(winOpponent);

  // ── CHART 11: Opponent Donut ──────────────────────────────
  drawOpponentDonut(winOpponent);

  // ── CHART 12: Over Progression ────────────────────────────
  drawOverProgression(overData, matches);

  // ── CHART 13: Head to Head Detail ─────────────────────────
  drawH2HDetail(matches, batting, bowling);

}).catch(err => console.error("Data load error:", err));


// ════════════════════════════════════════════════════════════
// CHART FUNCTIONS
// ════════════════════════════════════════════════════════════

// ── 1. RESULTS BY YEAR ──────────────────────────────────────
function drawResultsByYear(matches) {
  const container = "#chart-results-year";
  const W = getWidth(container), H = 280;
  const margin = { top: 20, right: 20, bottom: 50, left: 40 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  // Aggregate by year
  const byYear = d3.rollup(matches,
    v => ({
      Win:  v.filter(d => d.Pakistan_Result === "Win").length,
      Loss: v.filter(d => d.Pakistan_Result === "Loss").length,
      Tie:  v.filter(d => d.Pakistan_Result === "Tie").length,
    }),
    d => d.Year
  );

  const years = Array.from(byYear.keys()).sort();
  const data  = years.map(y => ({ year: y, ...byYear.get(y) }));
  const keys  = ["Win", "Loss", "Tie"];
  const stack = d3.stack().keys(keys)(data);

  const svg = d3.select(container).append("svg")
    .attr("width", W).attr("height", H)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(years).range([0, w]).padding(0.3);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.Win + d.Loss + d.Tie)]).nice().range([h, 0]);
  const color = d3.scaleOrdinal().domain(keys).range(["#00A550", "#FF4444", "#FFD700"]);

  // Grid
  svg.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-w).tickFormat(""));

  // Bars
  svg.selectAll(".layer")
    .data(stack)
    .enter().append("g")
      .attr("class", "layer")
      .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d)
    .enter().append("rect")
      .attr("x",      d => x(d.data.year))
      .attr("y",      d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width",  x.bandwidth())
      .attr("rx", 3)
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>${d.data.year}</strong><br/>
          Wins: ${d.data.Win}<br/>
          Losses: ${d.data.Loss}<br/>
          Ties: ${d.data.Tie}`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

  // Axes
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${h})`).call(d3.axisBottom(x));
  svg.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5));

  // Legend
  const legend = svg.append("g").attr("transform", `translate(${w - 100}, 0)`);
  keys.forEach((k, i) => {
    legend.append("rect").attr("x", 0).attr("y", i * 18)
      .attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", color(k));
    legend.append("text").attr("x", 16).attr("y", i * 18 + 10)
      .text(k).style("fill", "#7A8F7E").style("font-size", "11px");
  });
}


// ── 2. BATTING ORDER WIN RATE ────────────────────────────────
function drawBattingOrder(matches) {
  const container = "#chart-batting-order";
  const W = getWidth(container), H = 280;
  const margin = { top: 20, right: 20, bottom: 50, left: 50 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const data = ["First", "Second"].map(order => {
    const group = matches.filter(d => d.Pakistan_Batting_Order === order);
    const wins  = group.filter(d => d.Pakistan_Result === "Win").length;
    return { order, wins, total: group.length, rate: (wins / group.length * 100).toFixed(1) };
  });

  const svg = d3.select(container).append("svg")
    .attr("width", W).attr("height", H)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(["First", "Second"]).range([0, w]).padding(0.4);
  const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);

  svg.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-w).tickFormat(""));

  svg.selectAll(".bar")
    .data(data)
    .enter().append("rect")
      .attr("class", "bar-win")
      .attr("x",      d => x(d.order))
      .attr("y",      d => y(+d.rate))
      .attr("width",  x.bandwidth())
      .attr("height", d => h - y(+d.rate))
      .attr("rx", 4)
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>Bat ${d.order}</strong><br/>
          Matches: ${d.total}<br/>
          Wins: ${d.wins}<br/>
          Win Rate: ${d.rate}%`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

  // Value labels
  svg.selectAll(".label")
    .data(data)
    .enter().append("text")
      .attr("x", d => x(d.order) + x.bandwidth() / 2)
      .attr("y", d => y(+d.rate) - 8)
      .attr("text-anchor", "middle")
      .style("fill", "#C8FF00")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .text(d => d.rate + "%");

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${h})`).call(d3.axisBottom(x));
  svg.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"));
}


// ── 3. SCORE SCATTER ─────────────────────────────────────────
function drawScoreScatter(matches) {
  const container = "#chart-score-scatter";
  const W = getWidth(container), H = 380;
  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const valid = matches.filter(d => d.Pakistan_Runs && d.Opponent_Runs);
  const allRuns = valid.flatMap(d => [d.Pakistan_Runs, d.Opponent_Runs]);
  const runMin = d3.min(allRuns) - 10;
  const runMax = d3.max(allRuns) + 10;

  const svg = d3.select(container).append("svg")
    .attr("width", W).attr("height", H)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([runMin, runMax]).range([0, w]);
  const y = d3.scaleLinear().domain([runMin, runMax]).range([h, 0]);

  // Grid
  svg.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-w).tickFormat(""));

  // Diagonal reference line (equal scores)
  svg.append("line")
    .attr("x1", x(runMin)).attr("y1", y(runMin))
    .attr("x2", x(runMax)).attr("y2", y(runMax))
    .style("stroke", "rgba(255,255,255,0.1)")
    .style("stroke-dasharray", "5,5")
    .style("stroke-width", 1.5);

  svg.append("text")
    .attr("x", x(runMax) - 10).attr("y", y(runMax) - 8)
    .style("fill", "rgba(255,255,255,0.2)")
    .style("font-size", "10px")
    .text("Equal scores");

  // Dots
  svg.selectAll(".dot")
    .data(valid)
    .enter().append("circle")
      .attr("class", d => d.Pakistan_Result === "Win" ? "dot-win" : d.Pakistan_Result === "Loss" ? "dot-loss" : "dot-tie")
      .attr("cx", d => x(d.Opponent_Runs))
      .attr("cy", d => y(d.Pakistan_Runs))
      .attr("r",  7)
      .attr("opacity", 0.85)
      .attr("stroke", "#0A0F0D")
      .attr("stroke-width", 1.5)
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>${d["Match Number"]}</strong><br/>
          vs ${d.Opponent} · ${d.Year}<br/>
          PAK: ${d.Pakistan_Runs}/${d.Pakistan_Wickets}<br/>
          OPP: ${d.Opponent_Runs}/${d.Opponent_Wickets}<br/>
          Result: <strong>${d.Pakistan_Result}</strong>`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

  // Axes
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${h})`).call(d3.axisBottom(x));
  svg.append("g").attr("class", "axis")
    .call(d3.axisLeft(y));

  // Axis labels
  svg.append("text")
    .attr("x", w / 2).attr("y", h + 45)
    .attr("text-anchor", "middle")
    .style("fill", "#7A8F7E").style("font-size", "12px")
    .text("Opponent Runs");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -h / 2).attr("y", -45)
    .attr("text-anchor", "middle")
    .style("fill", "#7A8F7E").style("font-size", "12px")
    .text("Pakistan Runs");

  // Legend
  [["Win", "#00A550"], ["Loss", "#FF4444"], ["Tie", "#FFD700"]].forEach(([label, col], i) => {
    svg.append("circle").attr("cx", 10 + i * 70).attr("cy", -5).attr("r", 5).attr("fill", col);
    svg.append("text").attr("x", 18 + i * 70).attr("y", -1)
      .style("fill", "#7A8F7E").style("font-size", "11px").text(label);
  });
}


// ── 4. TOP BATSMEN ───────────────────────────────────────────
function drawTopBatsmen(topBatsmen) {
  const container = "#chart-top-batsmen";
  const W = getWidth(container), H = 380;
  const margin = { top: 20, right: 120, bottom: 40, left: 150 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const data = topBatsmen
    .filter(d => d.Innings >= 2)
    .sort((a, b) => b.Total_Runs - a.Total_Runs)
    .slice(0, 15);

  const svg = d3.select(container).append("svg")
    .attr("width", W).attr("height", H)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.Total_Runs) * 1.1]).range([0, w]);
  const y = d3.scaleBand().domain(data.map(d => d.Player)).range([0, h]).padding(0.25);

  svg.append("g").attr("class", "grid")
    .call(d3.axisBottom(x).tickSize(h).tickFormat(""))
    .attr("transform", "translate(0,0)");

  svg.selectAll(".bar")
    .data(data)
    .enter().append("rect")
      .attr("class", "bar-win")
      .attr("y",      d => y(d.Player))
      .attr("height", y.bandwidth())
      .attr("x",      0)
      .attr("width",  0)
      .attr("rx",     3)
      .transition().duration(800).delay((d, i) => i * 40)
      .attr("width",  d => x(d.Total_Runs));

  // Value labels
  svg.selectAll(".val-label")
    .data(data)
    .enter().append("text")
      .attr("x", d => x(d.Total_Runs) + 5)
      .attr("y", d => y(d.Player) + y.bandwidth() / 2 + 4)
      .style("fill", "#C8FF00")
      .style("font-size", "11px")
      .text(d => d.Total_Runs);

  // Avg label
  svg.selectAll(".avg-label")
    .data(data)
    .enter().append("text")
      .attr("x", w + 10)
      .attr("y", d => y(d.Player) + y.bandwidth() / 2 + 4)
      .style("fill", "#7A8F7E")
      .style("font-size", "10px")
      .text(d => `avg ${d.Avg_Runs.toFixed(1)}`);

  svg.selectAll(".bar-hit")
    .data(data)
    .enter().append("rect")
      .attr("class", "bar-hit")
      .attr("y",      d => y(d.Player))
      .attr("height", y.bandwidth())
      .attr("x",      0)
      .attr("width",  d => x(d.Total_Runs))
      .attr("fill",   "transparent")
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>${d.Player}</strong><br/>
          Total Runs: ${d.Total_Runs}<br/>
          Innings: ${d.Innings}<br/>
          Average: ${d.Avg_Runs.toFixed(1)}<br/>
          Best: ${d.Best_Score}<br/>
          4s: ${d.Total_Fours} · 6s: ${d.Total_Sixes}`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

  svg.append("g").attr("class", "axis").call(d3.axisLeft(y));
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(6));
}


// ── 5. RUNS VS STRIKE RATE BUBBLE ───────────────────────────
function drawBatBubble(topBatsmen) {
  const container = "#chart-bat-bubble";
  const W = getWidth(container), H = 280;
  const margin = { top: 20, right: 20, bottom: 50, left: 55 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const data = topBatsmen.filter(d => d.Innings >= 2 && d.Avg_Strike_Rate > 0).slice(0, 20);

  const svg = d3.select(container).append("svg")
    .attr("width", W).attr("height", H)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x  = d3.scaleLinear().domain([0, d3.max(data, d => d.Total_Runs) + 20]).range([0, w]);
  const y  = d3.scaleLinear().domain([80, d3.max(data, d => d.Avg_Strike_Rate) + 10]).range([h, 0]);
  const r  = d3.scaleSqrt().domain([1, d3.max(data, d => d.Innings)]).range([4, 18]);

  svg.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-w).tickFormat(""));

  svg.selectAll(".bubble")
    .data(data)
    .enter().append("circle")
      .attr("cx",      d => x(d.Total_Runs))
      .attr("cy",      d => y(d.Avg_Strike_Rate))
      .attr("r",       d => r(d.Innings))
      .attr("fill",    "#00A550")
      .attr("opacity", 0.7)
      .attr("stroke",  "#C8FF00")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>${d.Player}</strong><br/>
          Runs: ${d.Total_Runs}<br/>
          Avg SR: ${d.Avg_Strike_Rate.toFixed(1)}<br/>
          Innings: ${d.Innings}`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(5));
  svg.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5));

  svg.append("text").attr("x", w/2).attr("y", h+40).attr("text-anchor","middle")
    .style("fill","#7A8F7E").style("font-size","11px").text("Total Runs");
  svg.append("text").attr("transform","rotate(-90)").attr("x",-h/2).attr("y",-42)
    .attr("text-anchor","middle").style("fill","#7A8F7E").style("font-size","11px").text("Avg Strike Rate");
}


// ── 6. BOUNDARIES STACKED BAR ────────────────────────────────
function drawBoundaries(topBatsmen) {
  const container = "#chart-boundaries";
  const W = getWidth(container), H = 280;
  const margin = { top: 20, right: 20, bottom: 40, left: 120 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const data = topBatsmen
    .filter(d => d.Innings >= 2)
    .sort((a, b) => (b.Total_Fours + b.Total_Sixes) - (a.Total_Fours + a.Total_Sixes))
    .slice(0, 10);

  const keys  = ["Total_Fours", "Total_Sixes"];
  const stack = d3.stack().keys(keys)(data);

  const svg = d3.select(container).append("svg")
    .attr("width", W).attr("height", H)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.Total_Fours + d.Total_Sixes) + 5]).range([0, w]);
  const y = d3.scaleBand().domain(data.map(d => d.Player)).range([0, h]).padding(0.25);
  const color = d3.scaleOrdinal().domain(keys).range(["#00A550", "#C8FF00"]);

  svg.selectAll(".layer")
    .data(stack)
    .enter().append("g")
      .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d)
    .enter().append("rect")
      .attr("y",      d => y(d.data.Player))
      .attr("height", y.bandwidth())
      .attr("x",      d => x(d[0]))
      .attr("width",  d => x(d[1]) - x(d[0]))
      .attr("rx", 2)
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>${d.data.Player}</strong><br/>
          4s: ${d.data.Total_Fours}<br/>
          6s: ${d.data.Total_Sixes}`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

  svg.append("g").attr("class", "axis").call(d3.axisLeft(y));
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(5));

  // Legend
  [["4s", "#00A550"], ["6s", "#C8FF00"]].forEach(([label, col], i) => {
    svg.append("rect").attr("x", w - 60 + i * 30).attr("y", -5)
      .attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", col);
    svg.append("text").attr("x", w - 47 + i * 30).attr("y", 4)
      .style("fill", "#7A8F7E").style("font-size", "10px").text(label);
  });
}


// ── 7. TOP BOWLERS ───────────────────────────────────────────
function drawTopBowlers(topBowlers) {
  const container = "#chart-top-bowlers";
  const W = getWidth(container), H = 380;
  const margin = { top: 20, right: 120, bottom: 40, left: 150 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const data = topBowlers
    .filter(d => d.Matches >= 2)
    .sort((a, b) => b.Total_Wickets - a.Total_Wickets)
    .slice(0, 15);

  const svg = d3.select(container).append("svg")
    .attr("width", W).attr("height", H)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.Total_Wickets) + 2]).range([0, w]);
  const y = d3.scaleBand().domain(data.map(d => d.Bowler)).range([0, h]).padding(0.25);

  svg.append("g").attr("class", "grid")
    .call(d3.axisBottom(x).tickSize(h).tickFormat("")).attr("transform", "translate(0,0)");

  svg.selectAll(".bar")
    .data(data)
    .enter().append("rect")
      .attr("y",      d => y(d.Bowler))
      .attr("height", y.bandwidth())
      .attr("x",      0)
      .attr("width",  0)
      .attr("rx",     3)
      .attr("fill",   "#FF4444")
      .transition().duration(800).delay((d, i) => i * 40)
      .attr("width",  d => x(d.Total_Wickets));

  svg.selectAll(".val-label")
    .data(data)
    .enter().append("text")
      .attr("x", d => x(d.Total_Wickets) + 5)
      .attr("y", d => y(d.Bowler) + y.bandwidth() / 2 + 4)
      .style("fill", "#C8FF00").style("font-size", "11px")
      .text(d => d.Total_Wickets);

  svg.selectAll(".eco-label")
    .data(data)
    .enter().append("text")
      .attr("x", w + 10)
      .attr("y", d => y(d.Bowler) + y.bandwidth() / 2 + 4)
      .style("fill", "#7A8F7E").style("font-size", "10px")
      .text(d => `eco ${d.Avg_Economy.toFixed(2)}`);

  svg.selectAll(".bar-hit")
    .data(data)
    .enter().append("rect")
      .attr("y",      d => y(d.Bowler))
      .attr("height", y.bandwidth())
      .attr("x",      0).attr("width", d => x(d.Total_Wickets))
      .attr("fill",   "transparent")
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>${d.Bowler}</strong><br/>
          Wickets: ${d.Total_Wickets}<br/>
          Matches: ${d.Matches}<br/>
          Economy: ${d.Avg_Economy.toFixed(2)}<br/>
          Best: ${d.Best_Figures}wkts`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

  svg.append("g").attr("class", "axis").call(d3.axisLeft(y));
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(6));
}


// ── 8. BOWLING ECONOMY vs WICKETS SCATTER ───────────────────
function drawBowlScatter(topBowlers) {
  const container = "#chart-bowl-scatter";
  const W = getWidth(container), H = 280;
  const margin = { top: 20, right: 20, bottom: 50, left: 55 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const data = topBowlers.filter(d => d.Matches >= 2 && d.Avg_Economy > 0);

  const svg = d3.select(container).append("svg")
    .attr("width", W).attr("height", H)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([d3.min(data, d => d.Avg_Economy) - 0.5, d3.max(data, d => d.Avg_Economy) + 0.5]).range([0, w]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.Total_Wickets) + 1]).range([h, 0]);

  svg.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-w).tickFormat(""));

  svg.selectAll(".dot")
    .data(data)
    .enter().append("circle")
      .attr("cx",      d => x(d.Avg_Economy))
      .attr("cy",      d => y(d.Total_Wickets))
      .attr("r",       6)
      .attr("fill",    "#FF4444")
      .attr("opacity", 0.75)
      .attr("stroke",  "#C8FF00")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>${d.Bowler}</strong><br/>
          Wickets: ${d.Total_Wickets}<br/>
          Economy: ${d.Avg_Economy.toFixed(2)}<br/>
          Matches: ${d.Matches}`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(5));
  svg.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5));

  svg.append("text").attr("x", w/2).attr("y", h+40).attr("text-anchor","middle")
    .style("fill","#7A8F7E").style("font-size","11px").text("Avg Economy Rate");
  svg.append("text").attr("transform","rotate(-90)").attr("x",-h/2).attr("y",-42)
    .attr("text-anchor","middle").style("fill","#7A8F7E").style("font-size","11px").text("Total Wickets");
}


// ── 9. BOWLING WIN vs LOSS ───────────────────────────────────
function drawBowlWinLoss(bowling) {
  const container = "#chart-bowl-winloss";
  const W = getWidth(container), H = 280;
  const margin = { top: 20, right: 20, bottom: 50, left: 55 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  // Average economy per bowler split by win/loss
  const byResult = d3.rollup(
    bowling.filter(d => d.Economy > 0 && d.Pakistan_Result !== "Tie"),
    v => d3.mean(v, d => d.Economy),
    d => d.Pakistan_Result
  );

  const data = [
    { result: "Win",  economy: byResult.get("Win")  || 0 },
    { result: "Loss", economy: byResult.get("Loss") || 0 },
  ];

  const svg = d3.select(container).append("svg")
    .attr("width", W).attr("height", H)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(["Win", "Loss"]).range([0, w]).padding(0.4);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.economy) * 1.2]).range([h, 0]);
  const color = d3.scaleOrdinal().domain(["Win", "Loss"]).range(["#00A550", "#FF4444"]);

  svg.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-w).tickFormat(""));

  svg.selectAll(".bar")
    .data(data)
    .enter().append("rect")
      .attr("x",      d => x(d.result))
      .attr("y",      d => y(d.economy))
      .attr("width",  x.bandwidth())
      .attr("height", d => h - y(d.economy))
      .attr("rx",     4)
      .attr("fill",   d => color(d.result))
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>${d.result} matches</strong><br/>
          Avg Economy: ${d.economy.toFixed(2)}`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

  svg.selectAll(".val")
    .data(data)
    .enter().append("text")
      .attr("x", d => x(d.result) + x.bandwidth()/2)
      .attr("y", d => y(d.economy) - 8)
      .attr("text-anchor","middle")
      .style("fill","#C8FF00").style("font-size","13px").style("font-weight","600")
      .text(d => d.economy.toFixed(2));

  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x));
  svg.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5));

  svg.append("text").attr("transform","rotate(-90)").attr("x",-h/2).attr("y",-42)
    .attr("text-anchor","middle").style("fill","#7A8F7E").style("font-size","11px").text("Avg Economy Rate");
}


// ── 10. WIN RATE BY OPPONENT ─────────────────────────────────
function drawWinByOpponent(winOpponent) {
  const container = "#chart-win-opponent";
  const W = getWidth(container), H = 380;
  const margin = { top: 20, right: 80, bottom: 40, left: 110 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const data = winOpponent
    .filter(d => d.Total >= 1)
    .sort((a, b) => b.Total - a.Total);

  const svg = d3.select(container).append("svg")
    .attr("width", W).attr("height", H)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, 100]).range([0, w]);
  const y = d3.scaleBand().domain(data.map(d => d.Opponent)).range([0, h]).padding(0.3);

  // Background track
  svg.selectAll(".track")
    .data(data)
    .enter().append("rect")
      .attr("y",      d => y(d.Opponent))
      .attr("height", y.bandwidth())
      .attr("x",      0).attr("width", w)
      .attr("rx",     4).attr("fill","rgba(255,255,255,0.04)");

  // Win rate bar
  svg.selectAll(".bar")
    .data(data)
    .enter().append("rect")
      .attr("y",      d => y(d.Opponent))
      .attr("height", y.bandwidth())
      .attr("x",      0).attr("width", 0)
      .attr("rx",     4)
      .attr("fill",   d => d.Win_Rate >= 50 ? "#00A550" : "#FF4444")
      .transition().duration(800).delay((d,i) => i * 40)
      .attr("width",  d => x(d.Win_Rate));

  svg.selectAll(".pct")
    .data(data)
    .enter().append("text")
      .attr("x", d => x(d.Win_Rate) + 5)
      .attr("y", d => y(d.Opponent) + y.bandwidth()/2 + 4)
      .style("fill","#C8FF00").style("font-size","10px")
      .text(d => d.Win_Rate + "%");

  svg.selectAll(".total")
    .data(data)
    .enter().append("text")
      .attr("x", w + 8)
      .attr("y", d => y(d.Opponent) + y.bandwidth()/2 + 4)
      .style("fill","#7A8F7E").style("font-size","10px")
      .text(d => `${d.Win || 0}W-${d.Loss || 0}L`);

  svg.selectAll(".hit")
    .data(data)
    .enter().append("rect")
      .attr("y",      d => y(d.Opponent))
      .attr("height", y.bandwidth())
      .attr("x", 0).attr("width", w).attr("fill","transparent")
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>vs ${d.Opponent}</strong><br/>
          Matches: ${d.Total}<br/>
          Wins: ${d.Win || 0} · Losses: ${d.Loss || 0}<br/>
          Win Rate: ${d.Win_Rate}%`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

  svg.append("g").attr("class", "axis").call(d3.axisLeft(y));
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + "%"));
}


// ── 11. OPPONENT DONUT ───────────────────────────────────────
function drawOpponentDonut(winOpponent) {
  const container = "#chart-opponent-donut";
  const W = getWidth(container), H = 380;
  const R = Math.min(W, H) / 2 - 40;

  const data = winOpponent.filter(d => d.Total >= 1).sort((a,b) => b.Total - a.Total);

  const svg = d3.select(container).append("svg")
    .attr("width", W).attr("height", H)
    .append("g").attr("transform", `translate(${W/2},${H/2})`);

  const color = d3.scaleOrdinal(d3.schemeTableau10);
  const pie   = d3.pie().value(d => d.Total).sort(null);
  const arc   = d3.arc().innerRadius(R * 0.55).outerRadius(R);
  const arcHover = d3.arc().innerRadius(R * 0.55).outerRadius(R + 8);

  const arcs = svg.selectAll(".arc")
    .data(pie(data))
    .enter().append("g").attr("class", "arc");

  arcs.append("path")
    .attr("d", arc)
    .attr("fill", (d,i) => color(i))
    .attr("stroke", "#0A0F0D")
    .attr("stroke-width", 2)
    .on("mouseover", function(event, d) {
      d3.select(this).transition().duration(150).attr("d", arcHover);
      showTooltip(`<strong>vs ${d.data.Opponent}</strong><br/>
        Matches: ${d.data.Total}<br/>
        Wins: ${d.data.Win || 0} · Losses: ${d.data.Loss || 0}<br/>
        Win Rate: ${d.data.Win_Rate}%`, event);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function() {
      d3.select(this).transition().duration(150).attr("d", arc);
      hideTooltip();
    });

  // Center label
  svg.append("text").attr("text-anchor","middle").attr("dy","-0.2em")
    .style("fill","#E8EDE9").style("font-size","28px").style("font-family","'Bebas Neue',sans-serif")
    .text(d3.sum(data, d => d.Total));
  svg.append("text").attr("text-anchor","middle").attr("dy","1.2em")
    .style("fill","#7A8F7E").style("font-size","11px").style("letter-spacing","0.1em")
    .text("MATCHES");

  // Labels for bigger slices
  arcs.filter(d => (d.endAngle - d.startAngle) > 0.3)
    .append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor","middle")
      .style("fill","#fff").style("font-size","10px").style("font-weight","600")
      .text(d => d.data.Opponent.slice(0, 8));
}


// ── 12. OVER PROGRESSION ────────────────────────────────────
function drawOverProgression(overData, matches) {
  const select = document.querySelector("#match-select");

  // Populate dropdown
  matches.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m["Match Number"];
    opt.textContent = `${m["Match Number"]} · vs ${m.Opponent} (${m.Year}) — ${m.Pakistan_Result}`;
    select.appendChild(opt);
  });

  function draw(matchId) {
    d3.select("#chart-over-progression").selectAll("*").remove();

    const matchData = overData.filter(d => d.Match === matchId);
    if (!matchData.length) return;

    const container = "#chart-over-progression";
    const W = getWidth(container), H = 380;
    const margin = { top: 30, right: 120, bottom: 50, left: 55 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const innings1 = matchData.filter(d => d.Innings === 1).sort((a,b) => a.Over - b.Over);
    const innings2 = matchData.filter(d => d.Innings === 2).sort((a,b) => a.Over - b.Over);

    const maxOver = d3.max(matchData, d => d.Over);
    const maxRuns = d3.max(matchData, d => d.Cumulative_Runs);

    const svg = d3.select(container).append("svg")
      .attr("width", W).attr("height", H)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, maxOver]).range([0, w]);
    const y = d3.scaleLinear().domain([0, maxRuns + 10]).range([h, 0]);

    svg.append("g").attr("class","grid").call(d3.axisLeft(y).tickSize(-w).tickFormat(""));

    const lineGen = d3.line().x(d => x(d.Over)).y(d => y(d.Cumulative_Runs)).curve(d3.curveMonotoneX);

    // Innings 1 area
    const area1 = d3.area().x(d => x(d.Over)).y0(h).y1(d => y(d.Cumulative_Runs)).curve(d3.curveMonotoneX);
    svg.append("path").datum(innings1).attr("d", area1)
      .attr("fill","rgba(0,165,80,0.1)");

    // Innings 1 line
    svg.append("path").datum(innings1).attr("d", lineGen).attr("class","line-pak");

    // Innings 2 line
    svg.append("path").datum(innings2).attr("d", lineGen).attr("class","line-opp");

    // Dots with tooltip
    [innings1, innings2].forEach((inn, idx) => {
      svg.selectAll(`.dot-inn${idx}`)
        .data(inn)
        .enter().append("circle")
          .attr("cx", d => x(d.Over))
          .attr("cy", d => y(d.Cumulative_Runs))
          .attr("r",  4)
          .attr("fill", idx === 0 ? "#00C962" : "#FF4444")
          .attr("stroke","#0A0F0D").attr("stroke-width",1.5)
          .on("mouseover", (event, d) => {
            showTooltip(`<strong>Over ${d.Over}</strong><br/>
              Team: ${d.Batting_Team}<br/>
              Runs: ${d.Cumulative_Runs}<br/>
              Wickets: ${d.Wickets_Down}`, event);
          })
          .on("mousemove", moveTooltip)
          .on("mouseout",  hideTooltip);
    });

    svg.append("g").attr("class","axis").attr("transform",`translate(0,${h})`).call(d3.axisBottom(x).ticks(maxOver));
    svg.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6));

    svg.append("text").attr("x",w/2).attr("y",h+40).attr("text-anchor","middle")
      .style("fill","#7A8F7E").style("font-size","11px").text("Over");
    svg.append("text").attr("transform","rotate(-90)").attr("x",-h/2).attr("y",-42)
      .attr("text-anchor","middle").style("fill","#7A8F7E").style("font-size","11px").text("Cumulative Runs");

    // Legend
    const legendG = svg.append("g").attr("transform", `translate(0, ${h + 28})`);
    [["PAK", "#00A550"], [opponent, "#7A8F7E"]].forEach(([label, col], i) => {
      legendG.append("rect").attr("x", i * 100).attr("y", 0)
        .attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", col);
      legendG.append("text").attr("x", i * 100 + 14).attr("y", 9)
        .style("fill", "#7A8F7E").style("font-size", "11px").text(label);
    });
  }

  // Draw first match on load
  if (matches.length) draw(matches[0]["Match Number"]);

  select.addEventListener("change", e => draw(e.target.value));
}


// ── 13. HEAD TO HEAD DETAIL ──────────────────────────────────
function drawH2HDetail(matches, batting, bowling) {
  const opponents = [...new Set(matches.map(d => d.Opponent))].sort();
  const tabsDiv   = document.querySelector("#team-tabs");

  // Build tabs
  opponents.forEach((opp, i) => {
    const btn = document.createElement("button");
    btn.className = "team-tab" + (i === 0 ? " active" : "");
    btn.textContent = opp;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".team-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderH2H(opp);
    });
    tabsDiv.appendChild(btn);
  });

  function renderH2H(opponent) {
    d3.select("#chart-h2h-detail").selectAll("*").remove();
    document.querySelector("#h2h-stats").innerHTML = "";

    const filtered = matches.filter(d => d.Opponent === opponent);
    const wins     = filtered.filter(d => d.Pakistan_Result === "Win").length;
    const losses   = filtered.filter(d => d.Pakistan_Result === "Loss").length;
    const total    = filtered.length;
    const winRate  = ((wins / total) * 100).toFixed(1);
    const avgPak   = d3.mean(filtered, d => d.Pakistan_Runs).toFixed(1);
    const avgOpp   = d3.mean(filtered, d => d.Opponent_Runs).toFixed(1);
    const highPak  = d3.max(filtered, d => d.Pakistan_Runs);
    const highOpp  = d3.max(filtered, d => d.Opponent_Runs);

    // ── Bar chart: one bar group per match ────────────────
    const container = "#chart-h2h-detail";
    const W  = getWidth(container);
    const H  = Math.max(260, total * 60 + 60);
    const margin = { top: 20, right: 60, bottom: 40, left: 140 };
    const w  = W - margin.left - margin.right;
    const h  = H - margin.top - margin.bottom;

    const labels  = filtered.map(d => `${d.Year} · ${d["Match Number"]}`);
    const allRuns = filtered.flatMap(d => [d.Pakistan_Runs, d.Opponent_Runs]);

    const svg = d3.select(container).append("svg")
      .attr("width", W).attr("height", H)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x  = d3.scaleLinear().domain([0, d3.max(allRuns) + 20]).range([0, w]);
    const y0 = d3.scaleBand().domain(labels).range([0, h]).padding(0.3);
    const y1 = d3.scaleBand().domain(["Pakistan", opponent]).range([0, y0.bandwidth()]).padding(0.1);

    // Grid
    svg.append("g").attr("class", "grid")
      .call(d3.axisBottom(x).tickSize(h).tickFormat(""))
      .attr("transform", "translate(0,0)");

    const groups = svg.selectAll(".match-group")
      .data(filtered)
      .enter().append("g")
        .attr("class", "match-group")
        .attr("transform", (d, i) => `translate(0, ${y0(labels[i])})`);

    // Pakistan bar
    groups.append("rect")
      .attr("y",      y1("Pakistan"))
      .attr("height", y1.bandwidth())
      .attr("x",      0)
      .attr("width",  d => x(d.Pakistan_Runs))
      .attr("rx",     3)
      .attr("fill",   d => d.Pakistan_Result === "Win" ? "#00A550" : "#FF4444")
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>PAK vs ${opponent}</strong><br/>
          ${d["Match Number"]} · ${d.Year}<br/>
          PAK: ${d.Pakistan_Runs}/${d.Pakistan_Wickets}<br/>
          ${opponent}: ${d.Opponent_Runs}/${d.Opponent_Wickets}<br/>
          Result: <strong>${d.Pakistan_Result}</strong>`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

    // Opponent bar
    groups.append("rect")
      .attr("y",      y1(opponent))
      .attr("height", y1.bandwidth())
      .attr("x",      0)
      .attr("width",  d => x(d.Opponent_Runs))
      .attr("rx",     3)
      .attr("fill",   "#7A8F7E")
      .attr("opacity", 0.6)
      .on("mouseover", (event, d) => {
        showTooltip(`<strong>PAK vs ${opponent}</strong><br/>
          ${d["Match Number"]} · ${d.Year}<br/>
          PAK: ${d.Pakistan_Runs}/${d.Pakistan_Wickets}<br/>
          ${opponent}: ${d.Opponent_Runs}/${d.Opponent_Wickets}<br/>
          Result: <strong>${d.Pakistan_Result}</strong>`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

    // Run value labels
    groups.append("text")
      .attr("x", d => x(d.Pakistan_Runs) + 4)
      .attr("y", y1("Pakistan") + y1.bandwidth() / 2 + 4)
      .style("fill", "#C8FF00").style("font-size", "10px")
      .text(d => d.Pakistan_Runs);

    groups.append("text")
      .attr("x", d => x(d.Opponent_Runs) + 4)
      .attr("y", d => y1(opponent) + y1.bandwidth() / 2 + 4)
      .style("fill", "#aaa").style("font-size", "10px")
      .text(d => d.Opponent_Runs);

    // Result badge
    groups.append("text")
      .attr("x", w + 5)
      .attr("y", y0.bandwidth() / 2 + 4)
      .style("fill", d => d.Pakistan_Result === "Win" ? "#00A550" : d.Pakistan_Result === "Loss" ? "#FF4444" : "#FFD700")
      .style("font-size", "10px").style("font-weight", "600")
      .text(d => d.Pakistan_Result);

    svg.append("g").attr("class", "axis").call(d3.axisLeft(y0));
    svg.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(6));

    // Legend
    [["PAK", "#00A550"], [opponent, "#7A8F7E"]].forEach(([label, col], i) => {
      svg.append("rect").attr("x", i * 100).attr("y", -5)
        .attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", col);
      svg.append("text").attr("x", i * 100 + 14).attr("y", 4)
        .style("fill", "#7A8F7E").style("font-size", "11px").text(label);
    });

    // ── Stats strip ───────────────────────────────────────
    const statsDiv = document.querySelector("#h2h-stats");
    const stats = [
      { val: total,         label: "Matches" },
      { val: wins,          label: "PAK Wins" },
      { val: losses,        label: "PAK Losses" },
      { val: winRate + "%", label: "Win Rate" },
      { val: avgPak,        label: "Avg PAK Score" },
      { val: avgOpp,        label: `Avg ${opponent} Score` },
      { val: highPak,       label: "PAK Highest" },
      { val: highOpp,       label: `${opponent} Highest` },
    ];

    stats.forEach(s => {
      statsDiv.innerHTML += `
        <div class="h2h-stat">
          <span class="h2h-stat-val">${s.val}</span>
          <span class="h2h-stat-label">${s.label}</span>
        </div>`;
    });
  }

  // Draw first team on load
  if (opponents.length) renderH2H(opponents[0]);
}
