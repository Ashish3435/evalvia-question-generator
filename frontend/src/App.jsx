import React, { useState } from 'react';

export default function App() {
  const [subject, setSubject] = useState('Mathematics');
  const [totalMarks, setTotalMarks] = useState(40);

  // Percentages (0 to 100)
  const [easyPct, setEasyPct] = useState(30);
  const [medPct, setMedPct] = useState(50);
  const [hardPct, setHardPct] = useState(20);

  const [topic1, setTopic1] = useState('Algebra');
  const [topic1Weight, setTopic1Weight] = useState(40);
  const [topic2, setTopic2] = useState('Geometry');
  const [topic2Weight, setTopic2Weight] = useState(30);
  const [topic3, setTopic3] = useState('Trigonometry');
  const [topic3Weight, setTopic3Weight] = useState(30);

  const [mcqPct, setMcqPct] = useState(40);
  const [shortPct, setShortPct] = useState(40);
  const [longPct, setLongPct] = useState(20);

  const [loading, setLoading] = useState(false);
  const [swappingId, setSwappingId] = useState(null);
  const [paperData, setPaperData] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      subject,
      total_marks: parseInt(totalMarks, 10) || 40,
      difficulty_mix: {
        Easy: (parseFloat(easyPct) || 0) / 100,
        Medium: (parseFloat(medPct) || 0) / 100,
        Hard: (parseFloat(hardPct) || 0) / 100,
      },
      topic_weightage: {
        [topic1 || 'Topic 1']: (parseFloat(topic1Weight) || 0) / 100,
        [topic2 || 'Topic 2']: (parseFloat(topic2Weight) || 0) / 100,
        [topic3 || 'Topic 3']: (parseFloat(topic3Weight) || 0) / 100,
      },
      question_types: {
        MCQ: (parseFloat(mcqPct) || 0) / 100,
        "Short Answer": (parseFloat(shortPct) || 0) / 100,
        "Long Answer": (parseFloat(longPct) || 0) / 100,
      },
    };

    try {
      const response = await fetch('http://localhost:8000/api/generate-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Server status ${response.status}`);
      const data = await response.json();
      setPaperData(data);
    } catch (err) {
      setError(err.message || 'Failed to generate question paper.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async (slotId) => {
    if (!paperData) return;
    setSwappingId(slotId);

    const targetQuestion = paperData.questions.find((q) => q.slot_id === slotId);
    const existingTexts = paperData.questions.map((q) => q.question);

    const payload = {
      subject: paperData.subject,
      slot: {
        slot_id: targetQuestion.slot_id,
        type: targetQuestion.type,
        marks: targetQuestion.marks,
        topic: targetQuestion.topic,
        difficulty: targetQuestion.difficulty,
      },
      current_question: targetQuestion.question,
      existing_questions: existingTexts,
    };

    try {
      const response = await fetch('http://localhost:8000/api/swap-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Swap status ${response.status}`);
      const data = await response.json();

      setPaperData((prev) => ({
        ...prev,
        questions: prev.questions.map((q) =>
            q.slot_id === slotId ? data.replacement : q
        ),
      }));
    } catch (err) {
      alert(`Could not swap question: ${err.message}`);
    } finally {
      setSwappingId(null);
    }
  };

  return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
        <header className="max-w-6xl mx-auto py-4 border-b border-slate-800 flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-indigo-400">Evalvia Smart Question Generator</h1>
            <p className="text-slate-400 text-xs">Constraint-based paper compiler & human-in-the-loop editor</p>
          </div>
          <button
              onClick={() => window.print()}
              disabled={!paperData}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 cursor-pointer"
          >
            🖨️ Print Paper
          </button>
        </header>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Panel */}
          <form onSubmit={handleGenerate} className="lg:col-span-4 bg-slate-800/60 p-5 rounded-xl border border-slate-700/50 flex flex-col gap-4 h-fit text-xs">
            <h2 className="text-sm font-bold text-slate-200 border-b border-slate-700 pb-2">Paper Constraints</h2>

            <div>
              <label className="block text-slate-400 mb-1">Subject & Total Marks</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded p-2 focus:border-indigo-500"
                >
                  <option>Mathematics</option>
                  <option>Science</option>
                </select>
                <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded p-2 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Difficulty Split (%)</label>
              <div className="grid grid-cols-3 gap-1">
                <input type="number" value={easyPct} onChange={(e) => setEasyPct(e.target.value)} placeholder="Easy" className="bg-slate-900 border border-slate-700 p-1.5 rounded" />
                <input type="number" value={medPct} onChange={(e) => setMedPct(e.target.value)} placeholder="Med" className="bg-slate-900 border border-slate-700 p-1.5 rounded" />
                <input type="number" value={hardPct} onChange={(e) => setHardPct(e.target.value)} placeholder="Hard" className="bg-slate-900 border border-slate-700 p-1.5 rounded" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Question Type Mix (%)</label>
              <div className="grid grid-cols-3 gap-1">
                <input type="number" value={mcqPct} onChange={(e) => setMcqPct(e.target.value)} placeholder="MCQ" className="bg-slate-900 border border-slate-700 p-1.5 rounded" />
                <input type="number" value={shortPct} onChange={(e) => setShortPct(e.target.value)} placeholder="Short" className="bg-slate-900 border border-slate-700 p-1.5 rounded" />
                <input type="number" value={longPct} onChange={(e) => setLongPct(e.target.value)} placeholder="Long" className="bg-slate-900 border border-slate-700 p-1.5 rounded" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Topics & Weightage (%)</label>
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-3 gap-1">
                  <input type="text" value={topic1} onChange={(e) => setTopic1(e.target.value)} className="col-span-2 bg-slate-900 border border-slate-700 p-1.5 rounded" />
                  <input type="number" value={topic1Weight} onChange={(e) => setTopic1Weight(e.target.value)} className="bg-slate-900 border border-slate-700 p-1.5 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <input type="text" value={topic2} onChange={(e) => setTopic2(e.target.value)} className="col-span-2 bg-slate-900 border border-slate-700 p-1.5 rounded" />
                  <input type="number" value={topic2Weight} onChange={(e) => setTopic2Weight(e.target.value)} className="bg-slate-900 border border-slate-700 p-1.5 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <input type="text" value={topic3} onChange={(e) => setTopic3(e.target.value)} className="col-span-2 bg-slate-900 border border-slate-700 p-1.5 rounded" />
                  <input type="number" value={topic3Weight} onChange={(e) => setTopic3Weight(e.target.value)} className="bg-slate-900 border border-slate-700 p-1.5 rounded" />
                </div>
              </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded transition cursor-pointer"
            >
              {loading ? 'Solving Constraints & Generating...' : 'Generate Paper'}
            </button>
          </form>

          {/* Paper & Dashboard Preview Panel */}
          <main className="lg:col-span-8 flex flex-col gap-6">
            {error && <div className="bg-red-950/40 border border-red-800 text-red-300 p-4 rounded-xl text-xs">{error}</div>}

            {!loading && !paperData && (
                <div className="bg-slate-800/30 border border-slate-800 p-12 rounded-xl text-center text-slate-500 text-xs">
                  Configure parameters and click <strong>Generate Paper</strong> to execute constraint solver.
                </div>
            )}

            {loading && (
                <div className="bg-slate-800/30 border border-slate-800 p-12 rounded-xl text-center text-slate-400 text-xs animate-pulse">
                  Solving integer constraints and querying Groq...
                </div>
            )}

            {paperData && (
                <div className="flex flex-col gap-6">
                  {/* Warnings / Relaxation Reports */}
                  {paperData.warnings?.length > 0 && (
                      <div className="bg-amber-950/30 border border-amber-800/60 p-3 rounded-lg text-amber-300 text-xs flex flex-col gap-1">
                        <span className="font-bold">⚠️ Constraint Compromise Notice:</span>
                        {paperData.warnings.map((w, idx) => (
                            <p key={idx}>• {w}</p>
                        ))}
                      </div>
                  )}

                  {/* Printable Question Paper Document */}
                  <div id="printable-paper" className="bg-slate-800/60 border border-slate-700/50 p-8 rounded-xl flex flex-col gap-6 text-slate-100">
                    <div className="text-center border-b border-slate-700 pb-4">
                      <h2 className="text-xl font-bold uppercase tracking-wide">{paperData.subject} ASSESSMENT</h2>
                      <div className="flex justify-between text-xs text-slate-400 mt-2">
                        <span>Time Allowed: 90 Mins</span>
                        <span>Total Marks: {paperData.total_marks}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      {paperData.questions.map((q, idx) => (
                          <div key={q.slot_id} className="border-b border-slate-700/40 pb-4 flex flex-col gap-2">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex gap-2 items-start">
                                <span className="font-mono text-xs text-indigo-400 font-bold">{idx + 1}.</span>
                                <p className="text-sm text-slate-200">{q.question}</p>
                              </div>
                              <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                            [{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]
                          </span>
                                <button
                                    onClick={() => handleSwap(q.slot_id)}
                                    disabled={swappingId === q.slot_id}
                                    className="text-[10px] bg-indigo-950 text-indigo-300 hover:bg-indigo-900 border border-indigo-700 px-2 py-0.5 rounded cursor-pointer disabled:opacity-40"
                                >
                                  {swappingId === q.slot_id ? 'Swapping...' : '🔄 Swap'}
                                </button>
                              </div>
                            </div>

                            {q.options && (
                                <div className="grid grid-cols-2 gap-2 pl-6 mt-1 text-xs text-slate-300">
                                  {q.options.map((opt, i) => (
                                      <div key={i} className="bg-slate-900/50 p-1.5 rounded border border-slate-800">{opt}</div>
                                  ))}
                                </div>
                            )}

                            <div className="text-[11px] text-emerald-400 font-mono pl-6 mt-1">
                              Answer Key: {q.answer}
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                </div>
            )}
          </main>
        </div>
      </div>
  );
}