import React, { useMemo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function safeParse(jsonString) {
  try {
    return { data: JSON.parse(jsonString), error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

export function JsonCodePreview({ jsonString }) {
  const { pretty, error } = useMemo(() => {
    const { data, error } = safeParse(jsonString);
    if (error) return { pretty: jsonString, error };
    return { pretty: JSON.stringify(data, null, 2), error: null };
  }, [jsonString]);

  return (
    <div style={{ width: '100%' }}>
      {error && (
        <div style={{ marginBottom: 8, color: "crimson" }}>
          Invalid JSON: {String(error.message || error)}
        </div>
      )}

      <SyntaxHighlighter language="json" style={oneDark} wrapLongLines>
        {pretty}
      </SyntaxHighlighter>
    </div>
  );
}
