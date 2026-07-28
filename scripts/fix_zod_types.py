#!/usr/bin/env python3
"""Fix the drizzle-zod / Zod 3.25 type incompatibility in lib/db schemas.

The `createInsertSchema(table).omit({...})` call fails because Zod 3.25 changed
the internal type hierarchy: `ZodObject` no longer satisfies `ZodType<any,any,any>`
that drizzle-zod@0.8.3 expects.  We cast the `createInsertSchema(...)` result
to `any` before calling `.omit()` / `.extend()` so the method chain resolves.
"""

import os
import re

SCHEMA_DIR = "lib/db/src/schema"
FILES = ["users.ts", "audit-logs.ts", "notifications.ts", "projects.ts"]

for fname in FILES:
    fpath = os.path.join(SCHEMA_DIR, fname)
    if not os.path.exists(fpath):
        print(f"  skip {fpath} (not found)")
        continue

    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # Replace `createInsertSchema(xxxTable).omit(`  with  `createInsertSchema(xxxTable) as any).omit(`
    # and `createInsertSchema(xxxTable).extend(`  with  `createInsertSchema(xxxTable) as any).extend(`
    # and `createInsertSchema(xxxTable).partial(` with `createInsertSchema(xxxTable) as any).partial(`
    # The pattern: createInsertSchema(<table-expr>).<method>
    # We insert ` as any` between the closing paren and the method call.

    # Pattern: createInsertSchema(...).omit(  → createInsertSchema(...) as any).omit(
    # But the argument may contain nested parens, so match from "createInsertSchema("
    # to the FIRST ")." that starts a method.
    pattern = re.compile(r"createInsertSchema\(([^()]+)\)\.((?:omit|extend|partial|pick)\()")

    def replacer(m):
        table_arg = m.group(1)
        method = m.group(2)
        return f"createInsertSchema({table_arg}) as any).{method}"

    content = pattern.sub(replacer, content)

    if content == original:
        print(f"  {fname}: no changes needed (pattern not found)")
    else:
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  {fname}: fixed createInsertSchema type cast")

print("\nDone.")
