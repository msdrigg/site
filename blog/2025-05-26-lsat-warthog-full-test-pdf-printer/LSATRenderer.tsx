import React, { useCallback, useState } from "react";
import Heading from "@theme/Heading";
import "./LSATRenderer.css";
import Link from "@docusaurus/Link";

const preloadedTestPromises = {
    "140.json": import("./tests/140.json"),
    "141.json": import("./tests/141.json"),
    "157.json": import("./tests/157.json"),
    "158.json": import("./tests/158.json"),
};

type TestData = {
    module?: {
        moduleName?: string;
        description?: string;
        sections: Array<{
            sectionId?: string;
            directions?: string;
            items?: Array<QuestionData>;
        }>;
    };
};
type QuestionData = {
    itemPosition?: string;
    stimulusText?: string;
    stemText?: string;
    options?: Array<{
        optionLetter?: string;
        optionContent?: string;
    }>;
    correctAnswer?: string;
    hintGroup?: Array<{
        answerOptionExplanation?: Array<{
            optionLetter?: string;
            explanation?: string;
            isCorrect?: boolean;
        }>;
    }>;
};
type PrintMode = "test" | "everything" | "answers";

async function importTest(filename: string): Promise<TestData> {
    if (preloadedTestPromises[filename]) {
        return await preloadedTestPromises[filename];
    } else {
        throw new Error(`Test file ${filename} not found`);
    }
}

function LSATRenderer() {
    const [jsonInput, setJsonInput] = useState("");
    const [parsedData, setParsedData] = useState<TestData | null>(null);
    const [error, setError] = useState("");
    const [selectedTest, setSelectedTest] = useState("");
    const [printMode, setPrintMode] = useState<PrintMode>("test");

    const handleJsonChange: React.ChangeEventHandler<HTMLTextAreaElement> =
        useCallback((e) => {
            const value = e.target.value;
            setJsonInput(value);

            if (value.trim()) {
                try {
                    const parsed = JSON.parse(value);
                    setParsedData(parsed);
                    setError("");
                } catch {
                    setError("Invalid JSON format");
                    setParsedData(null);
                }
            } else {
                setParsedData(null);
                setError("");
            }
        }, []);

    const handleTestSelection: React.ChangeEventHandler<HTMLSelectElement> =
        useCallback(async (e) => {
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
        }, []);

    return (
        <div className="lsat-container">
            <div className="input-section">
                <Heading as="h2">LSAT Warthog Test Viewer</Heading>
                <p>
                    Select a preloaded test or paste your LSAT PrepTest JSON
                    below to generate a formatted document with answers and
                    explanations on separate pages.
                </p>

                <div className="test-selector">
                    <label htmlFor="test-dropdown">Select a Test</label>
                    <select
                        id="test-dropdown"
                        className="test-dropdown"
                        value={selectedTest}
                        onChange={handleTestSelection}
                    >
                        <option value="">-- Choose a test --</option>
                        {Object.keys(preloadedTestPromises).map((filename) => (
                            <option key={filename} value={filename}>
                                Test {filename.replace(".json", "")}
                            </option>
                        ))}
                        <option value="custom">Render my own LSAT JSON</option>
                    </select>
                </div>

                {parsedData && (
                    <div className="test-selector">
                        <label htmlFor="print-mode-dropdown">Print Mode</label>
                        <select
                            id="print-mode-dropdown"
                            className="test-dropdown"
                            value={printMode}
                            onChange={(e) =>
                                setPrintMode(e.target.value as PrintMode)
                            }
                        >
                            <option value="test">Print Test Only</option>
                            <option value="everything">Print Everything</option>
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
                {error && (
                    <div
                        className="error"
                        style={{
                            marginTop: "4px",
                        }}
                    >
                        {error}
                    </div>
                )}
                {parsedData && selectedTest === "custom" && (
                    <div
                        style={{
                            marginTop: "4px",
                            color: "#4caf50",
                            fontWeight: "bold",
                        }}
                    >
                        ✓ JSON parsed successfully! Scroll down to see the
                        formatted document.
                    </div>
                )}

                {parsedData && (
                    <button
                        onClick={() => window.print()}
                        style={{
                            marginTop: "10px",
                            padding: "8px 16px",
                            backgroundColor: "#4caf50",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Print Document
                    </button>
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
                            })}{" "}
                            by{" "}
                            <Link href={`${window.location.href}`}>
                                LSAT Warthog
                            </Link>
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

                            {section.items?.map((item) => (
                                <QuestionItem
                                    item={item}
                                    sectionNumber={sectionIdx + 1}
                                />
                            ))}
                        </div>
                    ))}

                    <AnswerKey parsedData={parsedData} printMode={printMode} />
                </div>
            )}
        </div>
    );
}

function AnswerKey({
    parsedData,
    printMode,
}: {
    parsedData: TestData | null;
    printMode: PrintMode;
}) {
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
                <Heading as="h1" className="answer-key-title">
                    Answer Key
                </Heading>

                <div className="quick-answers">
                    <Heading as="h2">Quick Reference</Heading>
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
                <Heading
                    as="h1"
                    className={`explanations-title ${
                        printMode === "test" ? "print-hidden" : ""
                    }`}
                >
                    Detailed Explanations
                </Heading>

                {allQuestions.map((q) => (
                    <div
                        key={`exp-${q.sectionNumber}-${q.position}`}
                        className={`explanation-block ${
                            printMode === "test" ? "print-hidden" : ""
                        }`}
                    >
                        <Heading as="h3">
                            Question {q.position} - Correct Answer: (
                            {q.correctAnswer})
                        </Heading>

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
                                                dangerouslySetInnerHTML={{
                                                    __html: cleanHtmlText(
                                                        exp.explanation
                                                    ),
                                                }}
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
}

function QuestionItem({
    item,
    sectionNumber,
}: {
    item: QuestionData;
    sectionNumber: number;
}) {
    const position = item.itemPosition || "";
    const stimulus = item.stimulusText || "";
    const stem = item.stemText || "";
    const options = item.options || [];

    const stimulusParas = formatPassageText(stimulus);

    return (
        <div key={`${sectionNumber}-${position}`} className="question-block">
            <Heading as="h3" className="question-number">
                Question {position}
            </Heading>

            {stimulus && (
                <div className="stimulus">
                    {stimulusParas.map((para, idx) => (
                        <p
                            key={idx}
                            className="stimulus-paragraph"
                            dangerouslySetInnerHTML={{
                                __html: cleanHtmlText(para),
                            }}
                        />
                    ))}
                </div>
            )}

            <div
                className="question-stem"
                dangerouslySetInnerHTML={{ __html: cleanHtmlText(stem) }}
            ></div>

            <div className="options">
                {options.map((option) => (
                    <div key={option.optionLetter} className="option">
                        <span className="option-letter">
                            ({option.optionLetter})
                        </span>
                        <span
                            className="option-content"
                            dangerouslySetInnerHTML={{
                                __html: cleanHtmlText(option.optionContent),
                            }}
                        ></span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function cleanHtmlText(text: string | null) {
    if (!text) return "";

    // For simple text cleaning (fallback)
    text = text.replace(/<p[^>]*>/g, "");
    text = text.replace(/<\/p>/g, "\n");
    text = text.replace(/style=['"][^'"]*['"]/g, "");
    text = text.replace(/\n\s*\n/g, "\n\n");
    text = text.trim();

    return text;
}

function formatPassageText(stimulusText: string | null) {
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
}

export default LSATRenderer;
