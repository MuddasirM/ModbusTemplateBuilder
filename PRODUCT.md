# Product

## Register

product

## Users

Two equal roles, often the same person at different times:

- **Field / commissioning technician**: importing a vendor-supplied register map (CSV or Excel) on-site or pre-site, converting it into an Argos XML template as part of a device setup job. Time pressure. Needs to trust the output without second-guessing it.
- **Back-office / integration engineer**: maintaining a library of Modbus templates, doing bulk edits, version-managing XML files. More deliberate pace, higher tolerance for density, still expects correctness above all.

Both are technically literate. Neither needs hand-holding on Modbus concepts.

## Product Purpose

A browser-based 4-step wizard (Import → Map → Edit → Preview) that converts register maps from spreadsheets (or an existing template file) into correctly formatted device-platform templates. Output format is selected up front via a dropdown — each format is a self-contained "variant bundle" declaring its own field schema, validation, and serializer. Argos XML is the first registered variant and is a web port of a Python desktop tool; its behavior is locked to the Python implementation by parity tests.

Success: a technician can go from a vendor CSV to an exportable, correct XML template in under two minutes, with no ambiguity about what the output will contain.

## Brand Personality

Clear · Efficient · Trustworthy

Voice: direct, technical, no filler. Error messages explain what went wrong and what to do. Labels say exactly what a field is. No marketing copy anywhere in the UI.

## Anti-references

- Generic SaaS dashboard (blue nav, metric cards, chart widgets; nothing says "industrial tool")
- Consumer / lifestyle app (rounded cards, warm gradients, product-hunt aesthetics)
- Dated enterprise software (gray Windows-Forms look, dense but un-designed)
- Over-branded dev tool (heavy chrome, custom scrollbars, too much personality for a utility)

## Design Principles

1. **The tool disappears into the task.** Users are in a workflow. The UI exists to move data correctly from input to output, not to be noticed. Every decorative choice is a cost.
2. **Density is a feature.** Engineers read tables. A compact, information-rich layout respects their expertise; padded-out cards do not.
3. **Correctness is the brand.** Validation, feedback, and output formatting must feel absolutely reliable. An error state that is vague or alarming breaks trust faster than any visual choice.
4. **Familiar over novel.** Standard form controls, standard navigation, standard affordances. Reinventing for flavor is a product ban here.
5. **One step at a time.** The wizard structure is the primary UX pattern. Each step should make the current action obvious and the next step clear, with no cognitive overhead from what came before or what comes next.

## Accessibility & Inclusion

No formal WCAG level mandated. Target sensible AA-level behaviour: readable contrast, full keyboard navigability, visible focus indicators, no information conveyed by color alone.
