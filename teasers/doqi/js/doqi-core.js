/* DOQI five-question teaser: scoring core.
 *
 * Mirrors the full game's logic (src/utils/archetypeUtils.js + QuizComponents.jsx):
 *   1. every chosen option adds its trait weights to a running trait total;
 *   2. each archetype's score is the sum of the totals of its three traits;
 *   3. the highest-scoring archetype wins.
 *
 * Five-question adaptation (see README, "Scoring adaptation"):
 *   - Answers are stored per question, so changing an answer REPLACES its
 *     contribution instead of adding a second one.
 *   - The full game has no absolute thresholds, only the argmax above, so no
 *     40-question threshold is reused. What does change with only five
 *     questions is tie frequency (~22% of answer paths tie under plain argmax),
 *     so ties are resolved by an explicit, documented procedure:
 *       a. more of the archetype's three traits actually scored above zero,
 *       b. higher single peak trait inside the archetype,
 *       c. the game's own file order (parity with the full assessment).
 *   - "Match strength" is normalised per archetype against the best score that
 *     archetype can reach across all 1,024 five-question answer paths.
 *
 * Works in the browser (window.DOQI_CORE) and in Node (module.exports) so the
 * same code is unit-tested and shipped.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DOQI_CORE = factory();
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this), function () {
  "use strict";

  function allTraitNames(data) {
    var names = [];
    data.traits.forEach(function (t) { if (names.indexOf(t.name) < 0) names.push(t.name); });
    data.questions.forEach(function (q) {
      q.options.forEach(function (o) {
        Object.keys(o.traits).forEach(function (t) { if (names.indexOf(t) < 0) names.push(t); });
      });
    });
    return names;
  }

  function emptyScores(data) {
    var s = {};
    allTraitNames(data).forEach(function (t) { s[t] = 0; });
    return s;
  }

  /** answers: array (length = questions.length) of option index or null. */
  function computeTraitScores(data, answers) {
    var scores = emptyScores(data);
    data.questions.forEach(function (q, i) {
      var idx = answers[i];
      if (idx === null || idx === undefined) return;
      var opt = q.options[idx];
      if (!opt) return;
      Object.keys(opt.traits).forEach(function (t) {
        scores[t] = (scores[t] || 0) + opt.traits[t];
      });
    });
    return scores;
  }

  function isComplete(data, answers) {
    if (!Array.isArray(answers) || answers.length !== data.questions.length) return false;
    return data.questions.every(function (q, i) {
      var v = answers[i];
      return Number.isInteger(v) && v >= 0 && v < q.options.length;
    });
  }

  function archetypeScore(traitScores, arch) {
    return arch.traits.reduce(function (sum, t) { return sum + (traitScores[t] || 0); }, 0);
  }

  var _maxCache = null;
  /** Best score each archetype can reach over every answer path (1,024 for 5x4). */
  function archetypeMaxima(data) {
    if (_maxCache) return _maxCache;
    var n = data.questions.length;
    var counts = data.questions.map(function (q) { return q.options.length; });
    var total = counts.reduce(function (a, b) { return a * b; }, 1);
    var maxima = {};
    data.archetypes.forEach(function (a) { maxima[a.title] = -Infinity; });
    var answers = new Array(n);
    for (var p = 0; p < total; p++) {
      var pp = p;
      for (var k = 0; k < n; k++) { answers[k] = pp % counts[k]; pp = Math.floor(pp / counts[k]); }
      var ts = computeTraitScores(data, answers);
      data.archetypes.forEach(function (a) {
        var s = archetypeScore(ts, a);
        if (s > maxima[a.title]) maxima[a.title] = s;
      });
    }
    _maxCache = maxima;
    return maxima;
  }

  function rankArchetypes(data, traitScores) {
    var ranked = data.archetypes.map(function (arch, order) {
      var breadth = arch.traits.filter(function (t) { return (traitScores[t] || 0) > 0; }).length;
      var peak = Math.max.apply(null, arch.traits.map(function (t) { return traitScores[t] || 0; }));
      return { archetype: arch, score: archetypeScore(traitScores, arch), breadth: breadth, peak: peak, order: order };
    });
    ranked.sort(function (a, b) {
      return (b.score - a.score) || (b.breadth - a.breadth) || (b.peak - a.peak) || (a.order - b.order);
    });
    return ranked;
  }

  function topTraits(data, traitScores, count) {
    return Object.keys(traitScores)
      .map(function (name) {
        var meta = data.traits.filter(function (t) { return t.name === name; })[0] || {};
        return { name: name, score: traitScores[name], desc: meta.desc || "", tagline: meta.tagline || "" };
      })
      .filter(function (t) { return t.score > 0; })
      .sort(function (a, b) { return (b.score - a.score) || a.name.localeCompare(b.name); })
      .slice(0, count || 3);
  }

  function evaluate(data, answers) {
    if (!isComplete(data, answers)) return null;
    var traitScores = computeTraitScores(data, answers);
    var ranked = rankArchetypes(data, traitScores);
    var best = ranked[0], second = ranked[1];
    var maxima = archetypeMaxima(data);
    var max = maxima[best.archetype.title] || 1;
    var strength = Math.max(0, Math.min(1, max > 0 ? best.score / max : 0));
    var tie = !!second && second.score === best.score;
    var tieRule = null;
    if (tie) {
      if (best.breadth !== second.breadth) tieRule = "breadth";
      else if (best.peak !== second.peak) tieRule = "peak";
      else tieRule = "order";
    }
    return {
      traitScores: traitScores,
      ranked: ranked,
      best: best.archetype,
      bestScore: best.score,
      runnerUp: second ? second.archetype : null,
      runnerUpScore: second ? second.score : null,
      margin: second ? best.score - second.score : best.score,
      tie: tie,
      tieRule: tieRule,
      strength: strength,
      strengthPercent: Math.round(strength * 100),
      topTraits: topTraits(data, traitScores, 3),
      workspace: data.workspaces[String(best.archetype.level)] || ""
    };
  }

  var TIE_RULE_TEXT = {
    breadth: "Tie on points. Resolved in favour of the profile with more of its three traits on record.",
    peak: "Tie on points and coverage. Resolved in favour of the profile holding your single strongest trait.",
    order: "Exact tie. Resolved by Department filing order, the same way the full assessment does it."
  };

  function resultText(result, opts) {
    opts = opts || {};
    var lines = [];
    lines.push("DOQI FIELD EVALUATION - FIVE-QUESTION PREVIEW (CLASSIFIED)");
    lines.push("Provisional classification: " + result.best.title);
    lines.push("Clearance level " + result.best.level + " (provisional)");
    lines.push("Match strength: " + result.strengthPercent + "%");
    lines.push("");
    lines.push(result.best.description.replace(/\s*\n\s*/g, " "));
    lines.push("");
    if (result.topTraits.length) {
      lines.push("Traits on record: " + result.topTraits.map(function (t) { return t.name + " (+" + t.score + ")"; }).join(", "));
    }
    if (result.runnerUp) lines.push("Also under review: " + result.runnerUp.title);
    if (result.tie && TIE_RULE_TEXT[result.tieRule]) lines.push(TIE_RULE_TEXT[result.tieRule]);
    lines.push("");
    lines.push("Fictional website teaser using five of the 40 questions in the full Field Evaluation. Not a real psychological evaluation.");
    lines.push("Full project: " + (opts.projectUrl || "https://brok3nbydesign.com/doqi.html"));
    lines.push("Independently created by Brok3n by Design.");
    return lines.join("\n");
  }

  return {
    allTraitNames: allTraitNames,
    emptyScores: emptyScores,
    computeTraitScores: computeTraitScores,
    isComplete: isComplete,
    archetypeScore: archetypeScore,
    archetypeMaxima: archetypeMaxima,
    rankArchetypes: rankArchetypes,
    topTraits: topTraits,
    evaluate: evaluate,
    resultText: resultText,
    TIE_RULE_TEXT: TIE_RULE_TEXT
  };
});
