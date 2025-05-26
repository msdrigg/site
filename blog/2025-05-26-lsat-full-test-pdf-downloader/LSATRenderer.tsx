import React, { useState } from "react";

const preloadedItemPromises = {
    "140.json": import("./tests/140.json"),
    "141.json": import("./tests/141.json"),
    "157.json": import("./tests/157.json"),
    "158.json": import("./tests/158.json"),
};

async function importTest(filename: string) {
    if (preloadedItemPromises[filename]) {
        return await preloadedItemPromises[filename];
    } else {
        throw new Error(`Test file ${filename} not found`);
    }
}

const LSATRenderer = () => {
    const [jsonInput, setJsonInput] = useState("");
    const [parsedData, setParsedData] = useState(null);
    const [error, setError] = useState("");
    const [selectedTest, setSelectedTest] = useState("");
    const [printMode, setPrintMode] = useState("everything");

    const cleanHtmlText = (text: string | null) => {
        if (!text) return "";

        // For simple text cleaning (fallback)
        text = text.replace(/<p[^>]*>/g, "");
        text = text.replace(/<\/p>/g, "\n");
        text = text.replace(/style=['"][^'"]*['"]/g, "");
        text = text.replace(/\n\s*\n/g, "\n\n");
        text = text.trim();

        return text;
    };

    const formatPassageText = (stimulusText) => {
        if (!stimulusText) return [""];

        // Split into paragraphs and format
        const paragraphs = stimulusText.split(/<p[^>]*>/);
        const formatted = [];

        paragraphs.forEach((para) => {
            if (para.trim()) {
                let cleaned = para.replace(/<\/p>/g, "");
                cleaned = cleaned.replace(/style=['"][^'"]*['"]/g, "");
                cleaned = cleanHtmlText(cleaned);
                if (cleaned.trim()) {
                    formatted.push(cleaned.trim());
                }
            }
        });

        return formatted;
    };

    const handleJsonChange = (e) => {
        const value = e.target.value;
        setJsonInput(value);

        if (value.trim()) {
            try {
                const parsed = JSON.parse(value);
                setParsedData(parsed);
                setError("");
            } catch (err) {
                setError("Invalid JSON format");
                setParsedData(null);
            }
        } else {
            setParsedData(null);
            setError("");
        }
    };

    const handleTestSelection = async (e) => {
        const filename = e.target.value;
        setSelectedTest(filename);

        if (filename === "custom") {
            // Clear data when switching to custom mode
            setJsonInput("");
            setParsedData(null);
            setError("");
        } else if (filename) {
            try {
                let parsed = await importTest(filename);
                setParsedData(parsed);
                setError("");
            } catch (err) {
                setError(`Error loading ${filename}: ${err.message}`);
            }
        } else {
            // Clear data when no option is selected
            setJsonInput("");
            setParsedData(null);
            setError("");
        }
    };

    const renderQuestion = (item, sectionNumber) => {
        const position = item.itemPosition || "";
        const stimulus = item.stimulusText || "";
        const stem = item.stemText || "";
        const options = item.options || [];

        const stimulusParas = formatPassageText(stimulus);

        return (
            <div
                key={`${sectionNumber}-${position}`}
                className="question-block"
            >
                <h3 className="question-number">Question {position}</h3>

                {stimulus && (
                    <div className="stimulus">
                        {stimulusParas.map((para, idx) => (
                            <p
                                key={idx}
                                className="stimulus-paragraph"
                                dangerouslySetInnerHTML={
                                    para
                                        ? { __html: cleanHtmlText(para) }
                                        : { __html: "" }
                                }
                            />
                        ))}
                    </div>
                )}

                <div
                    className="question-stem"
                    dangerouslySetInnerHTML={
                        stem ? { __html: cleanHtmlText(stem) } : { __html: "" }
                    }
                ></div>

                <div className="options">
                    {options.map((option) => (
                        <div key={option.optionLetter} className="option">
                            <span className="option-letter">
                                ({option.optionLetter})
                            </span>
                            <span
                                className="option-content"
                                dangerouslySetInnerHTML={
                                    option.optionContent
                                        ? {
                                              __html: cleanHtmlText(
                                                  option.optionContent
                                              ),
                                          }
                                        : { __html: "" }
                                }
                            ></span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderAnswerKey = () => {
        if (!parsedData?.module?.sections) return null;

        const allQuestions = [];
        parsedData.module.sections.forEach((section, sectionIdx) => {
            section.items?.forEach((item) => {
                allQuestions.push({
                    sectionNumber: sectionIdx + 1,
                    position: item.itemPosition,
                    correctAnswer: item.correctAnswer,
                    hintGroups: item.hintGroup || [],
                });
            });
        });

        return (
            <>
                <div
                    className={`page-break ${
                        printMode === "test" ? "print-hidden" : ""
                    }`}
                ></div>
                <div
                    className={`answer-key-section ${
                        printMode === "test" ? "print-hidden" : ""
                    }`}
                >
                    <h1 className="answer-key-title">Answer Key</h1>

                    <div className="quick-answers">
                        <h2>Quick Reference</h2>
                        <div className="answers-grid">
                            {allQuestions.map((q) => (
                                <div
                                    key={`${q.sectionNumber}-${q.position}`}
                                    className="quick-answer"
                                >
                                    <strong>Q{q.position}:</strong> (
                                    {q.correctAnswer})
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        className={`page-break ${
                            printMode === "test" ? "print-hidden" : ""
                        }`}
                    ></div>
                    <h1
                        className={`explanations-title ${
                            printMode === "test" ? "print-hidden" : ""
                        }`}
                    >
                        Detailed Explanations
                    </h1>

                    {allQuestions.map((q) => (
                        <div
                            key={`exp-${q.sectionNumber}-${q.position}`}
                            className={`explanation-block ${
                                printMode === "test" ? "print-hidden" : ""
                            }`}
                        >
                            <h3>
                                Question {q.position} - Correct Answer: (
                                {q.correctAnswer})
                            </h3>

                            {q.hintGroups.map((hintGroup, hintIdx) => (
                                <div key={hintIdx} className="hint-group">
                                    {hintGroup.answerOptionExplanation?.map(
                                        (exp) => (
                                            <div
                                                key={exp.optionLetter}
                                                className={`explanation ${
                                                    exp.isCorrect
                                                        ? "correct-exp"
                                                        : "incorrect-exp"
                                                }`}
                                            >
                                                <div className="explanation-header">
                                                    <strong>
                                                        ({exp.optionLetter}){" "}
                                                        {exp.isCorrect
                                                            ? "✓ CORRECT"
                                                            : "✗ Incorrect"}
                                                    </strong>
                                                </div>
                                                <div
                                                    className="explanation-text"
                                                    dangerouslySetInnerHTML={
                                                        exp.explanation
                                                            ? {
                                                                  __html: cleanHtmlText(
                                                                      exp.explanation
                                                                  ),
                                                              }
                                                            : { __html: "" }
                                                    }
                                                ></div>
                                            </div>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </>
        );
    };

    return (
        <div className="lsat-container">
            <style>{`
        .lsat-container {
          max-width: 100%;
          margin: 0 auto;
          font-family: 'Times New Roman', serif;
          font-size: 12px;
          background-color: var(--ifm-background-color);
          color: var(--ifm-font-color-base);
        }

        .input-section {
          background: oklch(0.95 0.01 0 / 0.2);
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 8px;
          border: 1px solid oklch(0.85 0.01 0 / 0.3);
          font-size: 14px;
          font-family: sans-serif;
        }

        .input-section h2 {
          margin-top: 0;
          color: var(--ifm-font-color-base);
        }

        .test-selector {
          margin-bottom: 15px;
        }

        .test-selector label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
          color: var(--ifm-font-color-base);
        }

        .test-dropdown {
          width: 100%;
          max-width: 300px;
          padding: 8px;
          border: 1px solid oklch(0.8 0.01 0 / 0.4);
          border-radius: 4px;
          font-size: 14px;
          background-color: var(--ifm-background-color);
          color: var(--ifm-font-color-base);
        }

        .json-input {
          width: 100%;
          height: 200px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          padding: 10px;
          border: 1px solid oklch(0.8 0.01 0 / 0.4);
          border-radius: 4px;
          resize: vertical;
          background-color: var(--ifm-background-color);
          color: var(--ifm-font-color-base);
        }

        .error {
          color: oklch(0.5 0.15 15 / 1);
          font-weight: bold;
          margin-top: 10px;
        }

        .document-section {
          background: var(--ifm-background-color);
          min-height: 100vh;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 2px solid var(--ifm-font-color-base);
          padding-bottom: 20px;
        }

        .module-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
          color: var(--ifm-font-color-base);
        }

        .description {
          font-size: 14px;
          font-style: italic;
          margin-bottom: 20px;
          color: oklch(0.6 0.01 0 / 0.8);
        }

        .section {
          margin-bottom: 50px;
        }

        .section-header {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 20px;
          text-decoration: underline;
          color: var(--ifm-font-color-base);
        }

        .directions {
          background-color: oklch(0.92 0.01 0 / 0.3);
          padding: 15px;
          border-left: 4px solid var(--ifm-font-color-base);
          margin-bottom: 30px;
          font-size: 14px;
          color: var(--ifm-font-color-base);
        }

        .question-block {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }

        .question-number {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          color: var(--ifm-font-color-base);
        }

        .stimulus {
          background-color: oklch(0.94 0.01 0 / 0.2);
          padding: 20px;
          border: 1px solid oklch(0.85 0.01 0 / 0.3);
          margin-bottom: 20px;
          border-radius: 4px;
          color: var(--ifm-font-color-base);
        }

        .stimulus-paragraph {
          margin-bottom: 0.2rem;
          text-indent: 1.5em;
          line-height: 1.6;
        }

        .question-stem {
          font-weight: bold;
          margin-bottom: 15px;
          font-size: 16px;
          color: var(--ifm-font-color-base);
        }

        .options {
          margin-left: 20px;
        }

        .option {
          margin-bottom: 8px;
          line-height: 1.4;
          display: flex;
          align-items: flex-start;
        }

        .option-letter {
          font-weight: bold;
          margin-right: 8px;
          min-width: 25px;
        }

        .option-content {
          flex: 1;
        }

        .page-break {
          page-break-before: always;
          height: 0;
        }

        .answer-key-section {
          margin-top: 40px;
        }

        .answer-key-title, .explanations-title {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid var(--ifm-font-color-base);
          padding-bottom: 10px;
          color: var(--ifm-font-color-base);
        }

        .quick-answers h2 {
          font-size: 18px;
          margin-bottom: 20px;
          color: var(--ifm-font-color-base);
        }

        .answers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
          margin-bottom: 30px;
        }

        .quick-answer {
          padding: 8px;
          background: oklch(0.93 0.01 0 / 0.4);
          border-radius: 4px;
          text-align: center;
          color: var(--ifm-font-color-base);
        }

        .explanation-block {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }

        .explanation-block h3 {
          font-size: 16px;
          margin-bottom: 15px;
          color: var(--ifm-font-color-base);
        }

        .explanation {
          margin-bottom: 10px;
          padding: 12px;
          border-left: 4px solid oklch(0.6 0.15 230 / 1);
          margin-left: 10px;
          color: var(--ifm-font-color-base);
        }

        .explanation.correct-exp {
          border-left-color: oklch(0.6 0.15 150 / 1);
          background-color: oklch(0.9 0.05 150 / 0.2);
        }

        .explanation.incorrect-exp {
          border-left-color: oklch(0.6 0.15 15 / 1);
          background-color: oklch(0.9 0.05 15 / 0.2);
        }

        .explanation-header {
          font-weight: bold;
          margin-bottom: 5px;
          color: var(--ifm-font-color-base);
        }

        .explanation-text {
          line-height: 1.5;
          color: var(--ifm-font-color-base);
        }

        .generation-date {
          font-size: 12px;
          color: oklch(0.6 0.01 0 / 0.8);
          margin-bottom: 10px;
        }

        @media print {
          .input-section {
            display: none !important;
          }
          
          .lsat-container {
            max-width: none;
            margin: 0;
          }
          
          .document-section {
            margin: 0;
            padding: 20px;
          }
          
          .question-block {
            page-break-inside: avoid;
            page-break-before: auto;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .answer-key-section {
            margin-top: 0;
          }
          
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>

            <div className="input-section">
                <h2>LSAT JSON Renderer</h2>
                <p>
                    Select a preloaded test or paste your LSAT PrepTest JSON
                    below to generate a formatted document with answers and
                    explanations on separate pages.
                </p>

                <div className="test-selector">
                    <label htmlFor="test-dropdown">
                        Select Preloaded Test:
                    </label>
                    <select
                        id="test-dropdown"
                        className="test-dropdown"
                        value={selectedTest}
                        onChange={handleTestSelection}
                    >
                        <option value="">-- Choose a test --</option>
                        {Object.keys(preloadedItemPromises).map((filename) => (
                            <option key={filename} value={filename}>
                                Test {filename.replace(".json", "")}
                            </option>
                        ))}
                        <option value="custom">Render my own LSAT JSON</option>
                    </select>
                </div>

                {parsedData && (
                    <div className="test-selector">
                        <label htmlFor="print-mode-dropdown">Print Mode:</label>
                        <select
                            id="print-mode-dropdown"
                            className="test-dropdown"
                            value={printMode}
                            onChange={(e) => setPrintMode(e.target.value)}
                        >
                            <option value="everything">Print Everything</option>
                            <option value="test">Print Test Only</option>
                            <option value="answers">Print Answers Only</option>
                        </select>
                    </div>
                )}

                {selectedTest === "custom" && (
                    <textarea
                        className="json-input"
                        placeholder="Paste your LSAT JSON data here..."
                        value={jsonInput}
                        onChange={handleJsonChange}
                    />
                )}
                {error && <div className="error">{error}</div>}
                {parsedData && (
                    <div
                        style={{
                            marginTop: "10px",
                            color: "#4caf50",
                            fontWeight: "bold",
                        }}
                    >
                        ✓ JSON parsed successfully! Scroll down to see the
                        formatted document.
                    </div>
                )}
            </div>

            {parsedData && (
                <div className="document-section">
                    <div className="header">
                        <div className="module-title">
                            {parsedData.module?.moduleName || "LSAT PrepTest"}
                        </div>
                        <div className="description">
                            {parsedData.module?.description || ""}
                        </div>
                        <div className="generation-date">
                            Generated on{" "}
                            {new Date().toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                            })}
                        </div>
                    </div>

                    {parsedData.module?.sections?.map((section, sectionIdx) => (
                        <div
                            key={section.sectionId || sectionIdx}
                            className={`section ${
                                printMode === "answers" ? "print-hidden" : ""
                            }`}
                        >
                            <div className="section-header">
                                Section {sectionIdx + 1}:{" "}
                                {section.sectionId ||
                                    `Section ${sectionIdx + 1}`}
                            </div>

                            {section.directions && (
                                <div
                                    className="directions"
                                    dangerouslySetInnerHTML={{
                                        __html: cleanHtmlText(
                                            section.directions
                                        ),
                                    }}
                                ></div>
                            )}

                            {section.items?.map((item) =>
                                renderQuestion(item, sectionIdx + 1)
                            )}
                        </div>
                    ))}

                    {renderAnswerKey()}
                </div>
            )}
        </div>
    );
};

export default LSATRenderer;
