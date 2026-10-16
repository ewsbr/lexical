/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { PROTOTYPE_CONFIG_METHOD } from './LexicalConstants.js';
import type { LEXICAL_NODE_BRAND } from './LexicalNode.js';
/**
 * The key of {@link SerializationSchema}'s phantom `Names` member. Declared
 * rather than defined: it exists only in the type system, so no value is ever
 * created and nothing is emitted for it.
 *
 * @internal
 */
declare const NAMES: unique symbol;
/**
 * The key of {@link NodeSerializationSchema}'s phantom `N` member, which
 * records the node a schema's names were checked against. Declared rather than
 * defined, like {@link NAMES}.
 *
 * @internal
 */
declare const CHECKED_AGAINST: unique symbol;
/**
 * The key of {@link SerializationSchema}'s phantom `In` member. Declared rather
 * than defined, like {@link NAMES}.
 *
 * @internal
 */
declare const INPUT: unique symbol;
/**
 * A function that validates an untrusted `value` (such as a property parsed
 * from JSON) and coerces it into the expected type `T`, returning a default
 * value when `value` is not in the expected domain.
 *
 * By convention — and exactly like the `parse` of {@link StateValueConfig} —
 * calling a `Parse` with `undefined` returns its default value.
 */
export type Parse<T> = (value: unknown) => T;
/**
 * A structural, introspectable description of a {@link SerializationSchema}. It carries
 * exactly the information needed to coerce a value (which the schema closes
 * over) so that tooling can also walk it — for example to derive a `fast-check`
 * arbitrary that generates example values, or to emit a JSON Schema document. The data
 * here is the same domain information the parser already needs, so making it
 * available costs (almost) nothing in the production bundle.
 */
export type SerializationSchemaMeta = {
    readonly kind: 'string';
} | {
    readonly kind: 'number';
    /** The inclusive lower bound of the domain, when constrained. */
    readonly min?: number;
    /** The inclusive upper bound of the domain, when constrained. */
    readonly max?: number;
    /** Whether the domain is restricted to integers. */
    readonly integer?: boolean;
    /** Whether a finite value outside the bounds clamps to the nearest. */
    readonly clamp?: boolean;
} | {
    readonly kind: 'boolean';
} | {
    readonly kind: 'enum';
    readonly values: readonly unknown[];
} | {
    readonly kind: 'array';
    readonly item: InnerSerializationSchema;
} | {
    readonly kind: 'nullable';
    readonly inner: InnerSerializationSchema;
    /** Whether a value equal to `inner`'s default is treated as `null`. */
    readonly defaultAsNull?: boolean;
} | {
    readonly kind: 'optional';
    readonly inner: InnerSerializationSchema;
    /** Whether a value equal to `inner`'s default is treated as absent. */
    readonly omitDefault?: boolean;
} | {
    readonly kind: 'union';
    readonly members: readonly InnerSerializationSchema[];
} | {
    readonly kind: 'raw';
} | {
    readonly kind: 'object';
    readonly fields: SerializationSchemaFields;
} | {
    readonly kind: 'aliased';
    readonly inner: InnerSerializationSchema;
    /** Legacy input spellings, mapped to the value each denotes. */
    readonly aliases: {
        readonly [alias: string]: unknown;
    };
} | {
    /**
     * A {@link transformValue}: `inner`'s domain on the way in, and an
     * opaque function on the way out.
     *
     * The kind exists to say that last part. The transform is an arbitrary
     * closure, so it is the one part of a schema that cannot be described
     * structurally, and a consumer that walked into `inner` and stopped —
     * which is what inheriting `inner`'s meta made every consumer do — would
     * be describing the schema's *input* while believing it had described
     * its output. For a generator of example inputs that is the right
     * answer; for a code generator it is a parse that silently drops the
     * transform.
     */
    readonly kind: 'transform';
    readonly inner: InnerSerializationSchema;
};
/** Domain constraints for {@link numberValue}. */
export interface NumberValueOptions {
    /**
     * Reject values below this bound (inclusive). With `integer`, the bound is
     * rounded up to the integer it admits — the same domain, stated so that
     * `clamp` and anything reading the schema's `meta` see a member.
     */
    readonly min?: number;
    /** Reject values above this bound (inclusive); see {@link NumberValueOptions.min}. */
    readonly max?: number;
    /** Reject values that are not integers. */
    readonly integer?: boolean;
    /**
     * Bring a value outside `min`/`max` to the nearest bound instead of
     * rejecting it. Only a finite number is clamped: a value that is not a
     * number at all, or is not an integer when `integer` is set, still falls
     * back to the default, because there is no nearest bound for it.
     *
     * The distinction matters wherever the bound exists to cap work rather than
     * to describe the domain. `ListItemNode`'s indent is capped because
     * applying it nests one list per level, and an over-deep item read as the
     * default `0` would be flattened, where clamping keeps it as deep as the
     * cap allows.
     */
    readonly clamp?: boolean;
}
/**
 * A `SerializationSchema` is a {@link Parse} (so it can be called directly to coerce a value
 * and dropped straight into {@link createState}'s `parse` option) that also
 * carries its recoverable {@link SerializationSchema.defaultValue | default} and an
 * introspectable {@link SerializationSchemaMeta | meta} description of its domain.
 *
 * Schemas are built with {@link stringValue}, {@link numberValue},
 * {@link booleanValue}, {@link enumValue}, {@link nullable}, and composed into
 * whole-object schemas with {@link objectValue} — {@link nodeSchema} for a
 * node's own, which is where accessors are named.
 */
export interface SerializationSchema<T, Decls = never, In = T> {
    (value: unknown): T;
    /**
     * The serialized values this schema *accepts*, as distinct from the `T` it
     * parses them to. The two differ wherever a schema reads more than it
     * writes: `numberValue` reads a stringified number, `aliasedValue` reads the
     * legacy spellings a document may still carry, `optional` reads an absent
     * property. Carried so that what generates or type-checks an *input* — a
     * `@lexical/fast-check` arbitrary, a document being parsed — can say what is
     * admissible rather than describing the output and being wrong about the
     * difference.
     *
     * Defaults to `T`, which is right for every schema that accepts exactly what
     * it produces.
     *
     * @internal
     */
    readonly [INPUT]?: In;
    /**
     * Every node member this schema's declarations name — each `field`, each
     * accessor `method`, each `when` predicate — carried in the type so that
     * `$config` can check them against the node they are declared for. Erased at
     * runtime: nothing reads it, and no combinator assigns it.
     *
     * Defaults to `never` — a schema that names nothing constrains nothing, and
     * `never` satisfies every checked position — so `SerializationSchema<T>`
     * still means what it always did and a plain `stringValue()` needs no node
     * to be declared against.
     *
     * @internal
     */
    readonly [NAMES]?: Decls;
    /** The value returned for an out-of-domain input, i.e. `schema(undefined)`. */
    readonly defaultValue: T;
    /** An introspectable description of this schema's domain. */
    readonly meta: SerializationSchemaMeta;
    /**
     * The name of the node setter that applies a parsed value of this schema when
     * the base {@link LexicalNode.updateFromJSON} walks a node's serialization
     * schema. When omitted, the setter name defaults to `set<Prop>` for the
     * property this
     * schema is bound to in a {@link nodeSchema} (e.g. `foo` → `setFoo`). Use
     * {@link withAccessors} to record a name that doesn't follow that convention
     * (e.g. TextNode's `text` → `setTextContent`), or a {@link SchemaField} to
     * write the value straight to a node field.
     */
    readonly setter?: SchemaSetterAccessor;
    /**
     * The name of the node getter that reads this property's value when the base
     * {@link LexicalNode.exportJSON} walks a node's serialization schema. When
     * omitted, the getter name defaults to `get<Prop>` (e.g. `foo` → `getFoo`).
     * Use
     * {@link withAccessors} to record a name that doesn't follow that convention
     * (e.g. TextNode's `text` → `getTextContent`), or a {@link SchemaField} to
     * read the value straight from a node field. A getter that returns
     * `undefined` omits the property from the exported JSON.
     */
    readonly getter?: SchemaGetterAccessor;
    /**
     * Whether two values of this schema's domain say the same thing, for the
     * comparisons that treat a value as absent: compaction dropping a property
     * whose value is {@link SerializationSchema.defaultValue | the default}, and
     * `optional({omitDefault})` / `nullable({defaultAsNull})`.
     *
     * Absent means identity, which is right for the primitive domains but never
     * true of a reference-typed default: {@link arrayValue} and
     * {@link objectValue} return a fresh value per parse, so without this an
     * array-valued property equal to its default would still be written out.
     * Mirrors `StateValueConfig.isEqual`, which exists for the same reason.
     *
     * Not consulted through a {@link unionValue}, which compares structurally
     * because it cannot know which member produced a value. The built-in
     * reference-typed comparators *are* that comparison, so only a custom one
     * from {@link transformValue} differs there; see `unionValue` for what it
     * costs.
     *
     * Declared with method syntax deliberately: TypeScript checks a method's
     * parameters bivariantly, which keeps `SerializationSchema<T>` assignable to
     * {@link AnySerializationSchema}. A property would make the type invariant
     * in `T` and every `AnySerializationSchema` position would reject it.
     *
     * `this: void` because method syntax otherwise implies a receiver this never
     * has: every caller reads the comparator off the schema and calls it on its
     * own — NodeState equality, `optional({omitDefault})` and the compact export
     * all do — so a comparator written to read `this.meta` type-checked and then
     * threw. Declaring the receiver away says so, and costs nothing: the `this`
     * parameter is not a parameter for bivariance's purposes, so the
     * assignability above is unchanged.
     */
    isEqual?(this: void, a: T, b: T): boolean;
    /**
     * Whether `value` is in this schema's domain, for {@link unionValue} deciding
     * which member a value belongs to.
     *
     * A schema is total — it always returns a value — so membership normally has
     * to be inferred from the parse: landing anywhere but the default means the
     * value was recognized. That inference cannot see a value the schema
     * *normalizes into* its own default, which is why a schema that accepts more
     * than its own value type says so directly.
     *
     * This asks about a serialized *input*, not about a parsed value, so it is
     * not a predicate on `T`: a schema that reads more than it writes accepts
     * inputs no `T` ever equals, and a {@link transformValue} out of its inner
     * type accepts none of the values it produces. In particular, a combinator
     * may — and {@link numberValue} with a `min` deliberately does — decline the
     * very value it defaults to, which is how a union member says "this value is
     * not mine" and lets the union fall through to the member that owns it.
     */
    accepts?(value: unknown): boolean;
}
/**
 * Whether two values of `schema`'s domain say the same thing: identity, unless
 * the schema declares otherwise. The identity test comes first so a primitive
 * domain — every schema but {@link arrayValue} and {@link objectValue} — costs
 * a comparison rather than a call.
 *
 * @internal
 */
export declare function isSchemaEqual<T>(schema: SerializationSchema<T, unknown, unknown>, a: T, b: T): boolean;
/**
 * Whether `value` is the one `schema` would restore for an absent property, so
 * writing it says nothing.
 *
 * @internal
 */
export declare function isSchemaDefault<T>(schema: SerializationSchema<T, unknown, unknown>, value: T): boolean;
/**
 * Declares that a serialized property *is* a node field, read and written
 * directly rather than through an accessor method. The kind is stated rather
 * than inferred from the name: a field and a method are different things to
 * reach for, and deciding between them by looking at the string would make a
 * node's field naming part of this API's contract.
 */
export interface SchemaFieldBase {
    readonly field: string;
    /**
     * The accessor method this direct field access stands in for, when it is not
     * the conventional `get<Prop>`/`set<Prop>` for the property. Naming one keeps
     * a subclass in charge of its own property: if any class between the one that
     * declared this field and the node's own class overrides that method, the
     * field access is abandoned and the method is called instead.
     *
     * Leaving it out defers to the conventional name, which is what nearly every
     * property wants — a node that predates its schema already has those
     * accessors, and overriding `getStyle()` on a TextNode subclass is ordinary,
     * so migrating a property to a field must not silently take that back. Name
     * one only when the accessor is spelled differently, as TextNode's `text` is
     * (`getTextContent`) and LinkNode's `url` is (`getURL`). A class with no such
     * method defers to nothing, since both prototypes then resolve `undefined`.
     */
    readonly method?: string;
}
/** A node field read directly on export. */
export interface SchemaGetterField extends SchemaFieldBase {
    /**
     * Declared as `never` rather than left out: an excess property is only
     * rejected for a fresh object literal, and these accessors are captured by
     * an inferred type parameter (so the schema can carry the names it
     * declares), which is not fresh. Stating the wrong direction's table as
     * `never` rejects it by assignability instead, which inference cannot
     * launder away.
     */
    readonly setterTable?: never;
    /**
     * The name of a node predicate that decides whether this property is written
     * at all. Naming it keeps the property on the direct-field path: without it,
     * a conditionally-persisted property needs an accessor method, and a method
     * is a call plus a `getLatest()` on every export of every node.
     *
     * The property is written only when its value differs from the schema
     * default *and* the predicate returns true — the default is what parsing
     * would restore anyway, so writing it says nothing, and testing it first is
     * what keeps the predicate off the common path. ElementNode's `textFormat`
     * and `textStyle` are the motivating case: both are persisted only for an
     * element with no TextNode child.
     *
     * The predicate must be a pure, zero-argument method: it is called once per
     * export by the walk for each property that names it, and once in total by
     * generated code, which hoists a predicate that several properties share.
     *
     * Like the field read it gates, this is what {@link SchemaFieldBase.method}
     * stands in for: a subclass that overrides that accessor abandons the field
     * *and* the predicate, because a method that replaces the read replaces the
     * decision to make it.
     */
    readonly when?: string;
    /**
     * A lookup table from the stored field value to the serialized one, for a
     * property whose two representations differ — TextNode stores `mode` as a
     * bitmask and serializes it as a name.
     *
     * Without this such a property needs an accessor method, and a method is a
     * call plus, by convention, a `getLatest()`. Stating the mapping keeps the
     * property on the direct-read path: the table is a plain object of
     * primitives, so it is as inlinable by a code generator as the field read is.
     *
     * The export direction's table; {@link SchemaSetterField.setterTable} is its
     * import mirror. Each is declared only on the direction that reads it, so
     * naming the wrong one is a type error rather than a silently ignored
     * property.
     */
    readonly getterTable?: {
        readonly [key: string]: unknown;
    };
}
/** A node field written directly on import. */
export interface SchemaSetterField extends SchemaFieldBase {
    /** @see {@link SchemaGetterField.setterTable} for why this is `never`. */
    readonly getterTable?: never;
    /**
     * A predicate gates the export direction only, so naming one here is the
     * same mistake as naming the wrong table; see
     * {@link SchemaGetterField.setterTable}.
     */
    readonly when?: never;
    /**
     * A lookup table from the serialized value to the stored one — the inverse of
     * {@link SchemaGetterField.getterTable}, for the import direction. The parsed
     * value is the key, so the schema still owns the domain: only a value the
     * schema admitted is ever looked up.
     */
    readonly setterTable?: {
        readonly [key: string]: unknown;
    };
}
/**
 * A node field in whichever direction it was declared for. Prefer the
 * direction-specific types when the direction is known — this union admits
 * both tables, so it cannot reject the one that does not belong.
 */
export type SchemaField = SchemaGetterField | SchemaSetterField;
/**
 * One direction of a {@link SerializationSchema} field: a method name, a
 * {@link SchemaField} naming a node field, or `null` for a direction that is
 * deliberately unsupported.
 */
export type SchemaAccessor = string | SchemaField | null;
/** How the export direction reaches a property. */
export type SchemaGetterAccessor = string | SchemaGetterField | null;
/** How the import direction reaches a property. */
export type SchemaSetterAccessor = string | SchemaSetterField | null;
/**
 * Both directions of a property that *is* a node field, as {@link withField}
 * takes them: the field name, the two value tables (each used by the one
 * direction it names), and the accessor each direction stands in for.
 */
export interface FieldOptions {
    readonly field: string;
    /** @see {@link SchemaGetterField.getterTable} */
    readonly getterTable?: {
        readonly [key: string]: unknown;
    };
    /** @see {@link SchemaSetterField.setterTable} */
    readonly setterTable?: {
        readonly [key: string]: unknown;
    };
    /** The getter this field read stands in for; see {@link SchemaFieldBase.method}. */
    readonly getter?: string;
    /** The setter this field write stands in for; see {@link SchemaFieldBase.method}. */
    readonly setter?: string;
    /**
     * The predicate gating the export direction; see
     * {@link SchemaGetterField.when}. Like `getterTable`, it belongs to one direction
     * only — the import direction has nothing to gate, since a property that was
     * not written is simply absent.
     */
    readonly when?: string;
}
/**
 * The node accessors a {@link SerializationSchema} field is applied through.
 *
 * A string resolves to a method on the node; `{field}` resolves to one of the
 * node's own fields. `null` states that the direction is deliberately
 * unsupported — an export-only property computed from others (`setter: null`,
 * as ListNode's `tag` is derived from `listType`) or an import-only one
 * (`getter: null`). Leaving a direction undefined uses the conventional
 * `get<Prop>`/`set<Prop>` name, which must exist: a name that resolves to
 * nothing would silently drop the property, so it fails at registration.
 *
 * The two directions are independent, and a node may reasonably mix them:
 * TableCellNode reads `headerState` straight off the field but applies it
 * through `setHeaderStyles`, which supplies a default mask.
 */
export interface SchemaAccessors {
    readonly getter?: SchemaGetterAccessor;
    readonly setter?: SchemaSetterAccessor;
}
/**
 * Every member of `N` a schema may name: its own fields (`__`-prefixed by
 * convention, which is what makes them distinguishable) and its methods, which
 * covers accessors and `when` predicates alike.
 *
 * This is what `$config` checks a node's schema against, so a `field`,
 * `getter`, `setter` or `when` naming something the node does not have is a
 * compile error at the declaration rather than a property that silently stops
 * round-tripping.
 */
export type MemberOf<N> = TaggedNamesOf<N> | ObligationsOf<N> | `declared:${'get' | 'set'}` | `derived:${'get' | 'set'}`;
/**
 * A node {@link nodeSchema} can check: one with a member list. A class with a
 * string index signature — and `any` — has `keyof N` of `string | number`, so
 * every name filter above reduces to `never` and a correctly spelled name was
 * refused with an error that named no member. Rather than declare such a node
 * unchecked, which is the silent failure the check exists to remove, it is
 * refused where the node is named.
 */
type Checkable<N> = string extends keyof N ? never : unknown;
/**
 * Every tagged name `N` admits, per position — the check that a declaration
 * names a member the node has *and* one usable where it was written.
 */
type TaggedNamesOf<N> = `field:${FieldsOf<N>}` | `get:${ZeroArgMethodsOf<N, unknown>}` | `set:${SettersOf<N>}` | `when:${ZeroArgMethodsOf<N, boolean>}`;
/**
 * What a declaration requires of the node member it names, beyond the member
 * existing: a field holds what the schema parses, a getter returns it, a setter
 * accepts it. A name says which member; these say what it has to be.
 *
 * Carried in the same phantom as the names, so nothing has to thread a second
 * one: a typo is a string mismatch and reports with the correction suggested,
 * while a type mismatch is an object mismatch and reports the two types.
 */
/**
 * Reading a field of `V` for a schema of `T`: safe when the field's type fits
 * the schema's domain, so the value travels in the parameter position and the
 * check is contravariant — the same shape, and the same reason, as
 * {@link GetterObligation}.
 */
/**
 * `Returnable` for the same reason {@link GetterObligation} uses it: `readonly`
 * is a property of the reference, not of the JSON, and serializing an array
 * does not mutate it — so a field declared `readonly number[]` satisfies an
 * `arrayValue(numberValue())` read, exactly as a method getter returning one
 * does. Checking the bare `T` rejected the field and accepted the method for
 * the same schema.
 */
interface FieldReadObligation<F extends string, V> {
    readonly reads: F;
    readonly read: (value: V) => void;
}
/**
 * Writing a field of `V` with a schema of `T`: safe when what the schema
 * parses fits the field, so the value is covariant, as {@link
 * SetterObligation} is.
 *
 * Split from the read direction because one obligation cannot answer both. It
 * was covariant only, which let `withField(stringValue(), {field: '__label'})`
 * discharge against `__label: string | number` — exporting `42` and parsing it
 * back gave `''` — while rejecting a getter-only `booleanValue()` reading
 * `__flag: true`, which is sound in the direction that one actually travels.
 */
interface FieldWriteObligation<F extends string, V> {
    readonly writes: F;
    readonly write: V;
}
/**
 * A `getterTable`'s check, in place of the field read it stands in for: every
 * value the table maps a stored value to has to be one the schema serializes,
 * or `undefined`, which omits the property. Nothing on the node can discharge
 * it — the field holds the table's keys, not its values — so it is decided
 * here: `never` when every value fits, and otherwise a shape no
 * {@link MemberOf} contains, reported at the property with the values that do
 * not. The import direction needs no counterpart: a `setterTable`'s values
 * are written into the field, which is a {@link FieldWriteObligation} over
 * those values.
 */
type GetterTableMismatch<F extends string, D, T> = [
    Exclude<D[keyof D], Returnable<T> | undefined>
] extends [never] ? never : TableValueMismatch<'getterTable', F, Exclude<D[keyof D], Returnable<T> | undefined>>;
interface TableValueMismatch<Table extends string, F extends string, V> {
    readonly table: Table;
    readonly field: F;
    readonly maps: V;
}
/**
 * A `setterTable`'s coverage: a parsed value the table does not map is stored
 * as the *encoded default*, so the table has to map every value the schema
 * can produce, the default first of all — one it does not map has no stored
 * form, and the walk would write the raw default into the field. A finite
 * domain (an enum's) is decidable here, compared as the property keys the
 * lookup uses; a domain the types cannot enumerate (`stringValue`'s) is left
 * to registration, which checks that the default is mapped. `never` when
 * every member has an entry, and otherwise a shape no {@link MemberOf}
 * contains, naming the members that do not.
 */
type SetterTableMissing<F extends string, E, T> = string extends T ? never : number extends T ? never : [Exclude<`${T & Keyable}`, `${keyof E & Keyable}`>] extends [never] ? never : TableKeyMissing<'setterTable', F, Exclude<`${T & Keyable}`, `${keyof E & Keyable}`>>;
/** What a template literal type can spell, which is what a property key is. */
type Keyable = string | number | bigint | boolean | null | undefined;
interface TableKeyMissing<Table extends string, F extends string, K> {
    readonly table: Table;
    readonly field: F;
    readonly lacks: K;
}
/**
 * What a getter may return for a schema of `T`.
 *
 * `readonly` is a property of the reference, not of the JSON: `MarkNode.getIDs`
 * returns `readonly string[]` for an `arrayValue(stringValue())` property, and
 * that is the same serialized array. Widening the array here accepts it without
 * accepting an element type the schema does not describe.
 */
type Returnable<T> = T extends readonly (infer E)[] ? readonly E[] : T;
interface GetterObligation<M extends string, R> {
    readonly get: M;
    /**
     * A function of `R` rather than an `R`, so the parameter position gives the
     * check its direction: what the getter *returns* has to be assignable to
     * what the schema says the property is, which is the direction the value
     * actually travels on export.
     */
    readonly returns: (value: R) => void;
}
interface SetterObligation<M extends string, A, R> {
    readonly set: M;
    /** Covariant: the parsed value is passed in, so it must fit the parameter. */
    readonly accepts: A;
    /**
     * What the setter may return, in the parameter position so the check runs in
     * the direction a value would travel. Nothing reads a setter's return — the
     * walk and the generated parsers both keep the node they already hold — but
     * a method that hands back something which is neither the node nor nothing
     * is not a setter, and naming one in this position is the mistake this
     * catches. `setLabel(v: string): string` type-checked before this existed.
     */
    readonly returns: (value: R) => void;
}
/**
 * What a setter may hand back: a `LexicalNode` — conventionally `this`, the
 * writable node it wrote — or nothing, for a setter that only mutates.
 *
 * The node is stated by the brand every `LexicalNode` carries rather than as
 * `LexicalNode`, because relating a class to `LexicalNode` compares every
 * member — the `this`-typed ones bring the whole class back in — and a schema
 * above its class naming a `this`-returning setter thereby resolved
 * `$config()`, whose return type is inferred from that schema: a cycle
 * reported as `TS7022` for a class nothing else had resolved first, and passed
 * for the rest by luck of ordering. Relating it to the brand resolves the
 * brand. A `{__key: string}` built by hand does not carry it.
 */
type SetterReturn = {
    readonly [LEXICAL_NODE_BRAND]: true;
} | void;
/** The obligations `N` satisfies, which is what discharges the ones declared. */
type ObligationsOf<N> = {
    [K in FieldsOf<N> & keyof N]: FieldReadObligation<K, N[K]>;
}[FieldsOf<N> & keyof N] | {
    [K in ZeroArgMethodsOf<N, unknown> & keyof N]: GetterObligation<K, ReturnOf<N[K]>>;
}[ZeroArgMethodsOf<N, unknown> & keyof N] | {
    [K in FieldsOf<N> & keyof N]: FieldWriteObligation<K, N[K]>;
}[FieldsOf<N> & keyof N] | {
    [K in SettersOf<N> & keyof N]: SetterObligation<K, FirstParamOf<N[K]>, ReturnOf<N[K]>>;
}[SettersOf<N> & keyof N];
type ReturnOf<M> = M extends (...args: never[]) => infer R ? R : never;
/**
 * The one value a setter is called with — when the method really is callable
 * with one value and nothing else.
 *
 * Matched as a *one-parameter* signature rather than "the first of however
 * many": a method with a second required parameter is not assignable to it,
 * which is the point. The walk calls a setter with the parsed value alone, so
 * `setter: 'setDimensions'` on a `setDimensions(width: number, height: number)`
 * type-checked and then wrote `undefined` into `__height`. A trailing
 * *optional* parameter still matches, because such a method genuinely is
 * callable with one argument.
 */
type FirstParamOf<M> = M extends (value: infer P) => unknown ? P : never;
/** `N`'s own fields, which are `__`-prefixed by convention. */
type FieldsOf<N> = Extract<Extract<keyof N, `__${string}`>, string>;
/**
 * `N`'s keys, less the ones whose *types* a node may derive from its own
 * `$config()`: `$config` itself, whose return type is inferred from the `json`
 * it is handed — the schema being checked — and the two JSON methods a node
 * types from it (`LexicalExportJSON<this>`, `LexicalUpdateJSON<...>`).
 * Deciding whether a key is a getter or a setter means instantiating `N[K]`,
 * and for those it is a cycle, which TypeScript resolves by dropping the
 * constraint — silently, so the whole check went quiet wherever a schema
 * reached its `$config`. None of the three is a member a declaration may
 * name, so skipping them costs nothing.
 *
 * By name, not by cause, and so not complete: a *fourth* member typed from
 * `$config` — an unannotated `helper() { return this.$config(); }`, or one
 * annotated `toJSON(): LexicalExportJSON<this>` — reopens the cycle for its
 * class alone, with no diagnostic. A second, keys-only name layer would
 * survive that cycle, but beside this check it made the ordinary case too
 * large for TypeScript to represent and the annotated one a hard error even
 * when its schema was right; so the rule is stated instead: a node whose
 * schema is checked keeps its members' types independent of its own
 * `$config`.
 */
type ScannableKeys<N> = Exclude<keyof N, typeof PROTOTYPE_CONFIG_METHOD | 'exportJSON' | 'updateFromJSON'>;
/**
 * `N`'s methods that take no argument and return `R`.
 *
 * A method that requires an argument is not assignable to `() => R`, which is
 * what rules a setter out of the getter position: `getter: 'setStyle'` names a
 * real method, and the walk would call it with nothing.
 */
type ZeroArgMethodsOf<N, R> = Extract<{
    [K in ScannableKeys<N>]: N[K] extends () => R ? K : never;
}[ScannableKeys<N>], string>;
/**
 * `N`'s methods that take at least one argument.
 *
 * The length test is what a signature check cannot do on its own: a zero-arg
 * method *is* assignable to `(value: never) => unknown`, so without it
 * `setter: 'getStyle'` would pass.
 */
type SettersOf<N> = Extract<{
    [K in ScannableKeys<N>]: N[K] extends (...args: infer P) => unknown ? P['length'] extends 0 ? never : K : never;
}[ScannableKeys<N>], string>;
/**
 * The node member an accessor names, tagged with the position it was named in.
 *
 * The tag is what carries the *role* into the flat union every declaration
 * merges into, and the role is what lets {@link MemberOf} answer a different
 * question per position rather than one question — "does the node have this
 * member?" — for all four. Still a union of string literals, so a typo is
 * still reported with the correction suggested.
 */
type AccessorName<A, Role extends 'get' | 'set', T> = A extends {
    readonly field: infer F extends string;
} ? `field:${F}` | `declared:${Role}` | (A extends {
    readonly method: infer M extends string;
} ? `${Role}:${M}` | MethodObligation<Role, M, T> : never) | (A extends {
    readonly when: infer W extends string;
} ? `when:${W}` : never) | (Role extends 'get' ? A extends {
    readonly getterTable: infer D;
} ? GetterTableMismatch<F, D, T> : FieldReadObligation<F, Returnable<T>> : A extends {
    readonly setterTable: infer E;
} ? FieldWriteObligation<F, E[keyof E]> | SetterTableMissing<F, E, T> : FieldWriteObligation<F, T>) : A extends string ? `${Role}:${A}` | `declared:${Role}` | MethodObligation<Role, A, T> : A extends null ? `derived:${Role}` : never;
/**
 * The obligation an accessor method carries, per direction.
 *
 * The getter's admits `undefined` on top of the schema's type: returning it is
 * how a getter omits the property from the exported JSON, which is what a
 * `when`-gated one does when its predicate says no.
 */
type MethodObligation<Role extends 'get' | 'set', M extends string, T> = Role extends 'get' ? GetterObligation<M, Returnable<T> | undefined> : SetterObligation<M, T, SetterReturn>;
/**
 * Both directions of a {@link SchemaAccessors}.
 *
 * Each direction is inferred from an *optional* property, so a value typed as
 * the interface rather than written as a literal yields the whole declared
 * type — `string` for a name — instead of `never`. Requiring the property
 * would make such a value name nothing and so discharge the check that
 * {@link nodeSchema} performs, which is the one thing this must not do:
 * `string` is not assignable to any node's {@link MemberOf}, so laundering an
 * accessor through a variable fails loudly rather than silently.
 */
type AccessorNames<A, T> = (A extends {
    readonly getter?: infer G;
} ? AccessorName<G, 'get', T> : never) | (A extends {
    readonly setter?: infer S;
} ? AccessorName<S, 'set', T> : never);
/**
 * Every name a {@link FieldOptions} declares, across both directions;
 * inferred from optional properties for the reason {@link AccessorNames} is.
 */
type FieldOptionNames<F, T> = (F extends {
    readonly field: infer N extends string;
} ? `field:${N}` | `declared:${'get' | 'set'}` : never) | (F extends {
    readonly getter?: infer G extends string;
} ? `get:${G}` : never) | (F extends {
    readonly setter?: infer S extends string;
} ? `set:${S}` : never) | (F extends {
    readonly when?: infer W extends string;
} ? `when:${W}` : never) | (F extends {
    readonly field: infer N extends string;
} ? (F extends {
    readonly getterTable: infer D;
} ? GetterTableMismatch<N, D, T> : FieldReadObligation<N, Returnable<T>>) | (F extends {
    readonly setterTable: infer E;
} ? FieldWriteObligation<N, E[keyof E]> | SetterTableMissing<N, E, T> : FieldWriteObligation<N, T>) : never) | (F extends {
    readonly getter?: infer G extends string;
} ? GetterObligation<G, Returnable<T> | undefined> : never) | (F extends {
    readonly setter?: infer S extends string;
} ? SetterObligation<S, T, SetterReturn> : never);
/** The members a schema's declarations name; see {@link MemberOf}. */
export type NamesOf<S> = S extends SerializationSchema<unknown, infer Decls, unknown> ? Decls : never;
/**
 * The obligations a property's *conventional* accessors carry: `get<Prop>` and
 * `set<Prop>`, which the walk resolves for any direction the schema does not
 * declare. A declared name is checked through {@link MemberOf}; a conventional
 * one was not checked at all, so `label: stringValue()` beside a
 * `setLabel(value: string): string` compiled, and `importJSON` handed back the
 * string. Each is one member indexed by name, so nothing here resolves the
 * class as a whole.
 *
 * `unknown` where the direction is declared or the accessor is sound, which
 * leaves the field's own type alone; otherwise a shape the field cannot be,
 * naming the accessor at fault.
 */
type Conventional<N, F> = {
    readonly [K in keyof F]: K extends string ? ConventionalAccessor<N, `get${Capitalize<K>}`, 'get', F[K]> & ConventionalAccessor<N, `set${Capitalize<K>}`, 'set', F[K]> : unknown;
};
type ConventionalAccessor<N, M extends string, Role extends 'get' | 'set', S> = [Extract<NamesOf<S>, `declared:${Role}` | `derived:${Role}`>] extends [
    never
] ? M extends keyof N ? (Role extends 'get' ? GetterObligation<M, Returnable<SerializationSchemaValue<S>> | undefined> : SetterObligation<M, SerializationSchemaValue<S>, SetterReturn>) extends (Role extends 'get' ? N[M] extends () => unknown ? GetterObligation<M, ReturnOf<N[M]>> : never : SetterObligation<M, FirstParamOf<N[M]>, ReturnOf<N[M]>>) ? unknown : ConventionalMismatch<M, SerializationSchemaValue<S>> : ConventionalMissing<M> : unknown;
/** A conventional accessor that exists but cannot take, or return, `T`. */
interface ConventionalMismatch<M extends string, T> {
    readonly conventionalAccessor: M;
    readonly mustHandle: T;
}
/** A conventional accessor the node does not have; the walk would throw. */
interface ConventionalMissing<M extends string> {
    readonly conventionalAccessor: M;
    readonly missing: true;
}
/**
 * Whether an accessor names a node field rather than a method.
 *
 * Generic in the field type so it narrows to the direction it was handed:
 * given a {@link SchemaGetterAccessor} it yields a {@link SchemaGetterField},
 * whose `getterTable` is then the only table in scope.
 */
export declare function isSchemaField<T extends SchemaFieldBase>(accessor: string | T | null | undefined): accessor is T;
/**
 * A class's composed serialization schema, property by property: what a
 * generated module is handed when its code is attached to a class, so that
 * the lookup tables it reads are the schema's own objects rather than copies
 * written into the module at build time.
 *
 * @internal
 */
export type ComposedSchemaFields = ReadonlyMap<string, AnySerializationSchema>;
/**
 * The `getterTable` table the property `key` exports through, from the schema it
 * was declared with. For generated code, which was compiled against a schema
 * that declared one; a schema without it is not the one the code was
 * generated from.
 *
 * A null-prototype copy, taken once when the code is attached: generated
 * code reaches a table with `in`, which walks the prototype, and the key it
 * reaches it with comes from the JSON on import and from the node's field on
 * export — so on a plain object `'toString'` would resolve to
 * Object.prototype's method and be stored or serialized as the property's
 * value. The walk reads the schema's own object through `hasOwnKey`, which
 * asks the same question of the same entries.
 *
 * @internal
 */
export declare function getterTableOf(fields: ComposedSchemaFields, key: string): {
    readonly [key: string]: unknown;
};
/**
 * The `setterTable` table the property `key` imports through; see
 * {@link getterTableOf}.
 *
 * @internal
 */
export declare function setterTableOf(fields: ComposedSchemaFields, key: string): {
    readonly [key: string]: unknown;
};
/**
 * The `index`th alias table in the property `key`'s schema, counting from the
 * outermost. Generated code numbers the tables in the order the compiler met
 * them, so this has to descend exactly the schemas the compiler descends, in
 * the same order: `aliasedValue` (which is also the one that has a table),
 * `nullable`, `optional` and `arrayValue` — each of which wraps a single inner
 * schema, so the walk is a chain. Every other kind is one the compiler refuses,
 * which means it emitted no code for this property and nothing calls this.
 * Descending one the compiler does not would find a table it never numbered and
 * hand back the wrong one, so anything else ends the walk. See
 * {@link getterTableOf}.
 *
 * @internal
 */
export declare function aliasTableOf(fields: ComposedSchemaFields, key: string, index: number): {
    readonly [key: string]: unknown;
};
/**
 * The stored form of the property `key`'s schema default: what its `setterTable`
 * table maps the default to, which is what the walk stores for a parsed value
 * the table does not map. Generated code falls back to it the same way — and
 * a miss is possible, since coverage is proved only for an enum's domain and
 * sampled for a bounded numeric one — so it reads the value here, off the
 * schema when the code is attached, rather than carrying it as a literal. A
 * table without the entry is refused when the class is registered.
 *
 * @internal
 */
export declare function setterDefaultOf(fields: ComposedSchemaFields, key: string): unknown;
/** A {@link SerializationSchema} for an unknown type, used where the type is not relevant. */
export type AnySerializationSchema = SerializationSchema<unknown, unknown, unknown>;
/**
 * A {@link SerializationSchema} that names no accessor: what every combinator
 * takes (see {@link withAccessors}), and what every `inner`, `item` and
 * `members` in a schema's {@link SerializationSchemaMeta | meta} is, so a
 * schema reached through those can be wrapped again as it is. A `fields`
 * record is not: see {@link SerializationSchemaFields}.
 */
export type InnerSerializationSchema = SerializationSchema<unknown, never, unknown>;
/**
 * The serialized values a schema accepts; see {@link SerializationSchema} and
 * its `In` parameter.
 */
export type SchemaInput<S> = S extends SerializationSchema<unknown, unknown, infer In> ? In : S extends NodeSerializationSchema<never, infer In> ? In : never;
/** The value type a {@link SerializationSchema} parses to. */
export type SerializationSchemaValue<S> = S extends SerializationSchema<infer T, unknown, unknown> ? T : never;
/**
 * A record of named {@link SerializationSchema}s: what an object schema's
 * {@link SerializationSchemaMeta | meta} holds in `fields`. A {@link nodeSchema}
 * is an object schema whose fields name accessors and an {@link objectValue}
 * is one whose fields do not, and the `meta` of the two is one type — so a
 * field read back from it may name one, and its type says so.
 */
export type SerializationSchemaFields = {
    readonly [key: string]: AnySerializationSchema;
};
/**
 * The record {@link objectValue} takes: fields that name no accessor, since an
 * object's field is not a node's property (see {@link withAccessors}).
 */
export type InnerSerializationSchemaFields = {
    readonly [key: string]: InnerSerializationSchema;
};
/**
 * Maps an object type `T` to the record of per-property
 * {@link SerializationSchema}s.
 *
 * The input domain is left open. A schema's `In` is what it *accepts*, which
 * is wider than what it produces wherever a schema reads more than it writes —
 * `numberValue()` is a `SerializationSchema<number, never, number | string>`,
 * since a stringified number is a value it reads. Pinning `In` to `T[K]` made
 * this type reject the combinator for the very type it names: a
 * `SerializationSchemaShape<{count: number}>` would not accept
 * `{count: numberValue()}`. What the shape is for is saying what each property
 * parses *to*, which is the `T[K]` above.
 */
export type SerializationSchemaShape<T> = {
    readonly [K in keyof T]-?: SerializationSchema<T[K], never, unknown>;
};
/**
 * The predicate `schema`'s author installed, or `undefined` where it has none
 * or carries only the one its combinator derived — see {@link DERIVED_ACCEPTS}.
 *
 * Exported for the two consumers that read a schema's *metadata* to stand in
 * for the schema — `@lexical/fast-check`'s arbitraries and the JSON code
 * generator — because a schema with one of these describes a domain no
 * metadata records, so neither may answer for it from the metadata alone.
 *
 * @internal
 */
export declare function declaredAccepts(schema: AnySerializationSchema): undefined | ((value: unknown) => boolean);
/**
 * Whether `source` carries `key` as its own property.
 *
 * A type predicate rather than a `boolean`, so a caller can read the value off
 * the narrowed `source` instead of casting an unindexable `object`.
 *
 * `Object.prototype.hasOwnProperty.call` rather than `Object.hasOwn`, which is
 * newer than the browser baseline these packages are linted against. Lives here
 * rather than in LexicalUtils because this module imports nothing from the rest
 * of the core, so it is the one the other direction can reach.
 *
 * @internal
 */
export declare function hasOwnKey<K extends string>(source: object, key: K): source is {
    readonly [P in K]: unknown;
};
/**
 * Build a {@link SerializationSchema} that returns `value` when it is a `string`, otherwise
 * returns `defaultValue` (the empty string by default).
 * @__NO_SIDE_EFFECTS__
 */
export declare function stringValue(defaultValue?: string): SerializationSchema<string>;
/**
 * Build a {@link SerializationSchema} that returns `value` when it is a finite `number`,
 * otherwise returns `defaultValue` (`0` by default). `NaN`, `Infinity`, and
 * `-Infinity` are all treated as out of domain since they can not be
 * round-tripped through JSON.
 *
 * A string spelled as a JSON number is accepted and converted, so a document
 * that stored `"120"` where Lexical writes `120` — a hand-authored fixture, a
 * converter, or a backend that stringified its numbers — keeps its value
 * instead of silently falling back to the default. The domain is still
 * numbers: that is what the schema reports and what parsing returns, a string
 * is only an input encoding of it. Only the JSON grammar is read, so notations
 * that JSON itself can not produce (`"0x10"`, `"1_000"`, `"+1"`, `"Infinity"`)
 * stay out of domain.
 *
 * @__NO_SIDE_EFFECTS__
 */
export declare function numberValue(defaultValue?: number, options?: NumberValueOptions): SerializationSchema<number, never, number | string>;
/**
 * Build a {@link SerializationSchema} that returns `value` when it is a `boolean`, otherwise
 * returns `defaultValue` (`false` by default).
 * @__NO_SIDE_EFFECTS__
 */
export declare function booleanValue(defaultValue?: boolean): SerializationSchema<boolean>;
/**
 * Build a {@link SerializationSchema} for a fixed set of allowed `values` (an
 * enumeration or a union of literals such as the `mode` of a TextNode). Returns
 * `value` when it is strictly equal to one of `values`, otherwise returns
 * `defaultValue`, which defaults to the first entry of `values`.
 *
 * The type parameter is `const`, so the literal types of `values` are inferred
 * directly — the caller does not need an `as const` assertion. (Pass an
 * explicit type argument, e.g. `enumValue<TextModeType>([...])`, to instead
 * assert the values against a known domain type.)
 *
 * `undefined` may be a member of the domain, and a declared `undefined`
 * default is taken as declared: `enumValue([undefined, 'middle', 'bottom'])`
 * and `enumValue(['middle', undefined], undefined)` both default to
 * `undefined`.
 *
 * `values` must be non-empty, which the type states as a tuple: an empty
 * domain admits nothing, so every value — including one the caller believes is
 * in the enum — would parse to a default that came from nowhere. A list built
 * at runtime is checked as well in a development build, since a type can be
 * asserted past.
 *
 * @example
 * ```ts
 * const parseMode = enumValue(['normal', 'token', 'segmented']);
 * //    ^? SerializationSchema<'normal' | 'token' | 'segmented'>, default 'normal'
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export declare function enumValue<const T, D extends T = T>(values: readonly [T, ...T[]], ...args: [] | [defaultValue: D]): SerializationSchema<T>;
/**
 * Combinator that makes any {@link SerializationSchema} nullable. The returned schema yields
 * `null` when the value is `null` or `undefined` (so `null` is its recoverable
 * default) and otherwise delegates to `inner`. This guarantees a `T | null`
 * result for an untrusted value, unlike `value || null`, which can pass a
 * non-`T` (or falsy) value straight through with the wrong type.
 *
 * Pass `{defaultAsNull: true}` when an in-band value equal to `inner`'s
 * default also means "no value" — the historical `serializedNode.rel || null`
 * idiom, where an empty string is not a real `rel`. Equality is `inner`'s own
 * (see {@link SerializationSchema.isEqual}), so a reference-typed default is
 * compared by content: `nullable(arrayValue(...), {defaultAsNull: true})`
 * reads an explicitly empty array as `null`.
 *
 * @example
 * ```ts
 * const parseRel = nullable(stringValue(), {defaultAsNull: true});
 * //    ^? SerializationSchema<string | null>
 * parseRel('noopener'); // 'noopener'
 * parseRel('');         // null ('' is stringValue's default)
 * parseRel(null);       // null
 * parseRel(undefined);  // null (the recoverable default)
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export declare function nullable<T, In = T>(inner: SerializationSchema<T, never, In>, options?: {
    readonly defaultAsNull?: boolean;
}): SerializationSchema<T | null, never, In | null | undefined>;
/**
 * Combinator that makes any {@link SerializationSchema} optional. The returned schema yields
 * `undefined` when the value is `undefined` (so `undefined` is its recoverable
 * default) and otherwise delegates to `inner`. Use it for serialized properties
 * that may be absent and, when absent, should stay absent (an exported `T |
 * undefined` property is omitted from the JSON rather than persisted).
 *
 * Pass `{omitDefault: true}` when an in-band value equal to `inner`'s default
 * means "absent" rather than "explicitly this value" — the historical
 * `serializedNode.width || undefined` idiom, where a falsy `0` is not a real
 * width. Such a value (and any out-of-domain input, which `inner` coerces to
 * its default) yields `undefined`, so it is omitted from the exported JSON
 * instead of being persisted as the default. Equality is `inner`'s own (see
 * {@link SerializationSchema.isEqual}), so a reference-typed default is
 * compared by content: `optional(arrayValue(...), {omitDefault: true})` omits
 * an explicitly empty array rather than persisting it.
 *
 * @example
 * ```ts
 * const parseWidth = optional(numberValue());
 * //    ^? SerializationSchema<number | undefined>
 * parseWidth(120);       // 120
 * parseWidth(undefined); // undefined (the recoverable default)
 *
 * const parseCellWidth = optional(numberValue(), {omitDefault: true});
 * parseCellWidth(0);     // undefined (0 is not a real width)
 * parseCellWidth('x');   // undefined (coerced to the default, then omitted)
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export declare function optional<T, In = T>(inner: SerializationSchema<T, never, In>, options?: {
    readonly omitDefault?: boolean;
}): SerializationSchema<T | undefined, never, In | undefined>;
/**
 * Combinator for a value whose domain is the union of several schemas, such as
 * a dimension that is either a number or the literal `'inherit'`. The domain
 * is inferred as the union of the members' value types; annotate the result
 * when you want to assert a narrower intended domain instead.
 *
 * A {@link SerializationSchema} is total — it always returns a value, falling
 * back to its own default rather than reporting a rejection — so a member is
 * considered to accept `value` when parsing it lands anywhere *other* than that
 * member's default, or when the value is itself that default (the one case a
 * total schema cannot distinguish from a fallback).
 *
 * Selection is in two passes. The first asks every member whether it accepts
 * the value *entirely* — every element of an array, every declared field of an
 * object — and the first such member wins. Only if none does are the members
 * asked again for a partial match, where the first accepting one wins and the
 * union yields what it parsed. So a member that normalizes its input
 * ({@link numberValue} reading a stringified number) composes here the same way
 * it behaves alone, and a value that belongs entirely to a later member is not
 * taken by an earlier one that would only partly coerce it — declaration order
 * decides between members that fit equally well, not between a complete fit and
 * a partial one. If no member accepts at all, the result is `defaultValue` when
 * given, otherwise the first member's default.
 *
 * The inference above is only the fallback. A member that declares its own
 * domain — which every combinator here does — is asked directly, and that is
 * the only way to recognize a value it normalizes
 * *into* its own default (`numberValue()` reading `'0'`). A member whose
 * `defaultValue` lies outside its own constrained domain
 * (`numberValue(0, {min: 1})`) is therefore declined for that value rather
 * than accepting it, and the union falls through to the next member.
 *
 * The result is itself a member of the union in both respects: it declares an
 * `accepts` that asks each member in turn, so a union nested in another union
 * (or reached through a wrapper) keeps its domain, and an `isEqual`, so a union
 * over a reference-typed member still compares by content.
 *
 * That equality is a structural comparison, not a member's own: a union picks a
 * member by what each *accepts*, and {@link transformValue} accepts one domain
 * and produces another, so which member produced a value is not something a
 * union can recover. {@link arrayValue} and {@link objectValue} compare
 * element-wise and field-wise, which is what this does, so a union over either
 * is unaffected. A **custom `isEqual` passed to `transformValue` is not
 * consulted through a union** — two values it would call equal are reported as
 * different, so a property holding one is written out instead of compacted
 * away, `optional({omitDefault})` around the union keeps it instead of
 * dropping it, and as a `createState` parse its `NodeState.toJSON()` writes the
 * value rather than omitting it, `$getStateChange` reports a change, and an
 * updater-form `$setState` performs the write. (A plain-value `$setState`
 * compares nothing either way.) Never the reverse, which would discard the
 * difference. Outside a union the comparator is used as declared.
 *
 * @example
 * ```ts
 * const parseDimension = unionValue([numberValue(), enumValue(['inherit'])], 'inherit');
 * //    ^? SerializationSchema<number | 'inherit'>
 * parseDimension(640);       // 640
 * parseDimension('640');     // 640 (numberValue reads a stringified number)
 * parseDimension('inherit'); // 'inherit'
 * parseDimension('banana');  // 'inherit' (no member accepts it)
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export declare function unionValue<const M extends readonly InnerSerializationSchema[]>(members: M, ...args: [] | [defaultValue: SerializationSchemaValue<M[number]>]): SerializationSchema<SerializationSchemaValue<M[number]>, never, SchemaInput<M[number]>>;
/**
 * A serialization schema with no outstanding names — every `field`, accessor
 * and predicate it declares has been checked against a node, which is what
 * {@link nodeSchema} does and reports by discharging them.
 *
 * `$config`'s `json` asks for this, so a schema that names anything has to be
 * built with {@link nodeSchema} and cannot reach a node unchecked.
 *
 * `N` records *which* node it was checked against, so discharging the names
 * does not also lose track of whose they were: `$config` asks for the schema
 * of the node it is declared on, and one checked against an unrelated class is
 * a compile error there rather than a set of accessors that happen not to
 * resolve at runtime. A schema checked against a base class still installs on
 * a subclass, which is the direction that stays true — every member it names
 * is inherited — and not the reverse.
 */
/**
 * What a {@link nodeSchema} carries: the properties a node declares, and a
 * kind of its own.
 *
 * Not a member of {@link SerializationSchemaMeta}, because a node schema is
 * never nested inside another schema. It describes a *node*, whose properties
 * are applied one at a time to an object the walk does not own, where an
 * `objectValue` describes a *value* that one property holds. Giving the two
 * separate types is what lets a consumer of either be sure which it has.
 */
export interface NodeSchemaMeta {
    readonly kind: 'node';
    readonly fields: SerializationSchemaFields;
}
export interface NodeSerializationSchema<N = unknown, In = unknown> {
    /**
     * The properties this node declares, and the whole of what a node schema is
     * at run time.
     *
     * A node schema is not a parser. Nothing ever calls one: the composition
     * reads these fields and the walk applies each one to the node, so the
     * whole-object machinery an {@link objectValue} carries — a parse that
     * builds an object, a default object, a field-wise equality, a membership
     * predicate — would be constructed per node class and never used. Leaving it
     * out is what keeps it out of an application that declares schemas and never
     * calls `objectValue` itself.
     */
    readonly meta: NodeSchemaMeta;
    /**
     * What this schema accepts, carried exactly as {@link SerializationSchema}
     * carries it: the composed input type a document is checked against.
     *
     * @internal
     */
    readonly [INPUT]?: In;
    /**
     * Declared as a function of `N` rather than an `N`, so the parameter
     * position gives the assignability its direction: a schema for a base class
     * satisfies a subclass's `$config`, and a subclass's does not satisfy the
     * base's. Optional and never assigned, like {@link SerializationSchema}'s
     * own phantom — a schema that names nothing is checked against nothing and
     * is installable anywhere.
     *
     * @internal
     */
    readonly [CHECKED_AGAINST]?: (node: N) => void;
}
/**
 * A node's serialization schema, checked against the node it is for.
 *
 * The same shape {@link objectValue} takes, with one type argument naming the
 * node — which is what lets every `field`, accessor `method` and `when`
 * predicate be verified to exist. A name the node does not have is a compile
 * error at the property that declares it, with the correction suggested:
 *
 * ```ts
 * const codeNodeSchema = nodeSchema<CodeNode>()({
 *   language: withField(optional(nullable(stringValue())), {
 *     field: '__langauge',
 *   }),
 * });
 * //          ~~~~~~~~~~~~
 * // Type '"field:__langauge"' is not assignable to type '... | TaggedNamesOf<CodeNode> | ObligationsOf<CodeNode>'.
 * //   Did you mean '"field:__language"'?
 * ```
 *
 * Where the schema is written does not change what is checked: a module-scope
 * `const` above the class — a class's *type* is in scope before its
 * definition, and this is what every built-in node does — or inline in
 * `$config()`, as `TabNode` spells it. Checking a declaration means resolving
 * the class's members, and an unannotated `$config()` has a return type
 * inferred from this very schema; the members whose types come from it are
 * skipped (`ScannableKeys`), and what a setter returns is compared against
 * the brand every node carries rather than all of `LexicalNode`
 * (`SetterReturn`), so that neither position asks the check for its own
 * answer.
 *
 * The result reports no outstanding names, which is what `$config`'s `json`
 * requires — so a schema that names anything has to come through here, and the
 * check cannot be skipped by declaring the properties some other way.
 *
 * @__NO_SIDE_EFFECTS__
 */
export declare function nodeSchema<N extends Checkable<N>>(): <const F extends {
    readonly [key: string]: SerializationSchema<unknown, MemberOf<N>, unknown>;
}>(fields: F & Conventional<N, F>) => NodeSerializationSchema<N, { readonly [K in keyof F]?: SchemaInput<F[K]>; }>;
/**
 * Combinator for a value that older documents may spell as one of a fixed set
 * of names — TextNode's `format: 'bold'` for the numeric bit it stands for.
 * A string matching one of `aliases` yields the value it names; anything else
 * is `inner`'s to validate, so the domain, the default and the equality all
 * stay `inner`'s and only the accepted *input* is wider.
 *
 * This is {@link transformValue} narrowed to the case where the normalization
 * is a lookup, and the reason to prefer it is that the lookup is data: it goes
 * into the schema's {@link SerializationSchemaMeta | meta}, where a tool can
 * see it. A `transformValue` keeps its function to itself, so its meta can say
 * only that a transform happens: example generation still reaches the inner
 * domain, and a code generator refuses the property rather than compile a
 * parse that stores the alias where the schema stores what it names.
 *
 * @example
 * ```ts
 * const parseFormat = aliasedValue(numberValue(), TEXT_TYPE_TO_FORMAT);
 * //    ^? SerializationSchema<number>
 * parseFormat(1);      // 1
 * parseFormat('bold'); // IS_BOLD
 * parseFormat('42');   // 42 (not an alias, so numberValue reads it)
 * parseFormat('junk'); // 0  (numberValue falls back to its default)
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export declare function aliasedValue<T, const A extends {
    readonly [alias: string]: T;
}, In = T>(inner: SerializationSchema<T, never, In>, aliases: A): SerializationSchema<T, never, In | Extract<keyof A, string>>;
/**
 * Combinator that normalizes the value another {@link SerializationSchema} parsed, for
 * serialized properties whose accepted domain is wider than the stored one —
 * the motivating case is a legacy shorthand that older documents carry
 * (`format: 'bold'`) being folded into the stored numeric form. `inner` still
 * owns the domain: it validates the untrusted input (falling back to its
 * default as usual), and `transform` then maps every value it can produce
 * into the target domain, so the node's setter only ever sees normalized
 * values.
 *
 * `transform` must be pure and total over `inner`'s outputs: it runs once
 * when the schema is built to derive the {@link SerializationSchema.defaultValue}
 * (the transform of `inner`'s default) and once per parsed value. The
 * {@link SerializationSchemaMeta | meta} is a `transform` kind holding
 * `inner`, so introspection still reaches the accepted input domain — tooling
 * that generates example JSON keeps generating the legacy forms, which is
 * exactly what a parser test wants to exercise. Like every combinator, this
 * takes a schema that names no accessor; see {@link withAccessors}.
 *
 * `inner`'s {@link SerializationSchema.isEqual | isEqual} is *not* inherited:
 * it compares values of `inner`'s domain, and the transformed domain may be a
 * different type entirely. Pass `{isEqual}` when the output domain is
 * reference-typed, or a transformed array/object property can never compact
 * away and, used as a `createState` parse, dirties its node on every write of
 * an equal value.
 *
 * A comparator passed here is used wherever this schema is used directly, but
 * is *not* consulted when the schema is a {@link unionValue} member: a union
 * selects by what a member accepts, and this accepts `inner`'s domain while
 * producing another, so it cannot tell which member made a value and compares
 * structurally instead. The effect is a stricter answer than yours — a value
 * you would call the default is written out rather than compacted away — never
 * a looser one.
 *
 * Only then: an equality is for a domain `===` cannot compare, so declaring
 * one over a primitive output is an error. `===` already answers there, and a
 * comparator can only widen it — call two distinct serialized values equal —
 * after which the compact form omits whichever is not the default and parsing
 * restores the default in its place. A rotation compared modulo 360 serializes
 * `360` as nothing and reads back as `0`. Normalize in the `transform`
 * instead, where the value that reaches storage is the one that round-trips.
 *
 * @example
 * ```ts
 * const parseFormat = transformValue(
 *   unionValue(
 *     [numberValue(), enumValue(['bold', 'italic', 'underline'])],
 *     0,
 *   ),
 *   value => (typeof value === 'string' ? TEXT_TYPE_TO_FORMAT[value] : value),
 * );
 * //    ^? SerializationSchema<number>
 * parseFormat(1);      // 1
 * parseFormat('bold'); // IS_BOLD
 * parseFormat('junk'); // 0 (inner falls back to its default)
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export declare function transformValue<Inner, Out, In = Inner>(inner: SerializationSchema<Inner, never, In>, transform: (value: Inner) => Out, options?: {
    readonly isEqual?: (a: Out, b: Out) => boolean;
}): SerializationSchema<Out, never, In>;
/**
 * Build a {@link SerializationSchema} for a value this schema deliberately does not
 * validate, because something else owns its domain — the motivating case is a
 * nested {@link SerializedEditor}, which the nested editor's own
 * `parseEditorState` validates when the property is applied.
 *
 * The value is passed through unchanged and `undefined` is the recoverable
 * default, so declaring the property still routes it through the node's setter
 * (and keeps it visible to schema-walking tooling) without pretending to
 * validate its contents.
 * @__NO_SIDE_EFFECTS__
 */
export declare function rawValue<T>(): SerializationSchema<T | undefined, never, unknown>;
/**
 * Build a {@link SerializationSchema} for an array whose entries are each coerced by `item`.
 * A non-array value (including `undefined`) yields the empty array, which is the
 * recoverable default.
 *
 * @example
 * ```ts
 * const parseIds = arrayValue(stringValue());
 * //    ^? SerializationSchema<string[]>
 * parseIds(['a', 'b']); // ['a', 'b']
 * parseIds('nope');     // []
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export declare function arrayValue<T, In = T>(item: SerializationSchema<T, never, In>): SerializationSchema<T[], never, readonly In[]>;
/**
 * Compose per-property {@link SerializationSchema}s into a single {@link SerializationSchema} for an
 * object-valued property. Calling it coerces each known property in turn
 * (ignoring any extra properties), so `objectValue(...)` applied to a partial
 * or untrusted object returns a fully-populated, validated object;
 * `objectValue(...)(undefined)` returns the all-defaults object. Its fields
 * name no accessor: an object's field is not a node's property, which is what
 * {@link nodeSchema} — the same record, checked against a node — is for.
 *
 * @example
 * ```ts
 * // A property whose value is an object of its own; a node's own schema is
 * // nodeSchema<MyNode>()({...}), whose fields may name accessors.
 * const dimensions = objectValue({
 *   height: numberValue(),
 *   width: numberValue(),
 * });
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export declare function objectValue<const S extends InnerSerializationSchemaFields>(fields: S): ObjectSchema<S>;
/** What {@link objectValue} returns: one property per field, and no names. */
type ObjectSchema<S extends SerializationSchemaFields> = SerializationSchema<{
    [K in keyof S]: SerializationSchemaValue<S[K]>;
}, never, {
    [K in keyof S]?: SchemaInput<S[K]>;
}>;
/**
 * Return a copy of `schema` that declares the serialized property to *be* a
 * node field rather than a pair of accessor methods.
 *
 * This is the fast path in both directions: exporting reads the field, and
 * importing assigns it, with no method call on either side — and no version
 * resolution either way, since the node being parsed into is writable by
 * construction and the node being exported is one the walk already resolved
 * from the EditorState. Because the name is recorded on the schema, an introspecting
 * tool (a codegen pass emitting a specialized parser for a hot node type) can
 * see that a property is a plain field and compile it to a direct assignment.
 * Use {@link withAccessors} with a `{field}` on one side only when the two
 * directions differ — reading the field but writing through a method that
 * normalizes, as TableCellNode's `headerState` does.
 *
 * The trade-off is that a field access is exactly that: normalization,
 * validation or bookkeeping a `set<Prop>` method would do is skipped, and a
 * subclass override of that method is not consulted. Use it when the property
 * really is the field — which is also what makes it safe to compile away.
 *
 * Each direction still stands in for an accessor, so a subclass that overrode
 * one still decides; see {@link SchemaFieldBase.method}. That accessor is the
 * conventional `get<Prop>`/`set<Prop>` unless `getter`/`setter` name a
 * different one, so most declarations need neither — name one only where the
 * accessor is spelled differently, as TextNode's `text` is (`getTextContent`).
 * A node with no such method defers to nothing, which needs no declaring.
 *
 * `getterTable`/`setterTable` declare a property whose stored and serialized forms
 * differ ({@link SchemaGetterField.getterTable} / {@link SchemaSetterField.setterTable}),
 * and `when` names the predicate gating the export direction
 * ({@link SchemaGetterField.when}).
 *
 * @example
 * ```ts
 * nodeSchema<TextNode>()({
 *   // TextNode's own field in both directions, deferring to getStyle/setStyle
 *   // for a subclass that overrides either — neither is spelled here, since
 *   // both are the conventional name for a `style` property.
 *   style: withField(stringValue(), {field: '__style'}),
 *   // LinkNode's own field, standing in for getURL/setURL rather than the
 *   // getUrl/setUrl the property name would derive.
 *   url: withField(stringValue(), {
 *     field: '__url',
 *     getter: 'getURL',
 *     setter: 'setURL',
 *   }),
 * });
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export declare function withField<T, const F extends FieldOptions, In = T>(schema: SerializationSchema<T, never, In>, field: F): SerializationSchema<T, FieldOptionNames<F, T>, In>;
/**
 * Return a copy of `schema` that records both accessor names at once, which is
 * the common case for a property whose node methods do not follow the default
 * `get<Prop>`/`set<Prop>` naming. Either direction may be omitted to keep the
 * conventional name for that one.
 *
 * **This and {@link withField} go outside every other combinator**, because an
 * accessor answers for the property as a whole and each combinator widens what
 * the property holds: `nullable` admits `null`, `optional` admits an absent
 * value, `transformValue` produces a type of its own, and a union produces any
 * member's. `nullable(withAccessors(stringValue(), {setter: 'setLabel'}))`
 * obliged `setLabel` to take a `string` while the parser hands it `null` for a
 * document that omits the property. Written the other way round —
 * `withAccessors(nullable(stringValue()), {setter: 'setNullableLabel'})` — the
 * obligation is stated for what the property really parses to, and the
 * compiler checks it. Exactly once per property: a second layer would name a
 * direction the first already named, and the walk calls only the outer one —
 * an obligation checked for an accessor that is never called — so both
 * directions are named in one call, and every combinator, this one included,
 * refuses a schema that already names an accessor. A development build holds
 * the rule at run time too, for a caller the types do not reach.
 *
 * @example
 * ```ts
 * nodeSchema<TextNode>()({
 *   text: withAccessors(stringValue(), {
 *     getter: 'getTextContent',
 *     setter: 'setTextContent',
 *   }),
 * });
 * ```
 * @__NO_SIDE_EFFECTS__
 */
export declare function withAccessors<T, const A extends SchemaAccessors, In = T>(schema: SerializationSchema<T, never, In>, accessors: A): SerializationSchema<T, AccessorNames<A, T>, In>;
export {};
