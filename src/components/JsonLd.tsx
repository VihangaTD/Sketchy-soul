/**
 * Injects schema.org structured data.
 *
 * Rendered from a server component so the JSON is present in the initial HTML —
 * Googlebot indexes it without having to execute any JavaScript.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];

  return (
    <>
      {payload.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Structured data is generated from our own typed data, never user
          // input; the replace() defuses any stray `</script>` all the same.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
