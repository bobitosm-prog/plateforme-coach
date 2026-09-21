/** Keep an operation id across network retries; a changed payload gets a new id. */
export async function mutateProgram(
  input: Record<string, unknown>,
  retry: { current: { body: string; id: string } | null },
) {
  const body = JSON.stringify(input);
  if (retry.current?.body !== body)
    retry.current = { body, id: crypto.randomUUID() };
  const response = await fetch("/api/training-program", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, operationId: retry.current.id }),
  });
  if (!response.ok)
    throw new Error(
      response.status === 422 ? "PROGRAM_INVALID" : response.status === 409 ? "PROGRAM_CHANGED" : "PROGRAM_UNAVAILABLE",
    );
  return response.json();
}
