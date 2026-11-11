import { SegmentSdkError, issue } from "./errors.js";
function clone(value) {
    return structuredClone(value);
}
function sameJson(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
function isAggregate(condition) {
    return "aggregate" in condition;
}
function makeRef(kind, id) {
    return Object.freeze(Object.assign(Object.create(null), { kind, id }));
}
function isCard(expression) {
    return expression.kind === "card";
}
function serializeExpression(expression) {
    if (isCard(expression))
        return { filter: clone(expression.filter) };
    const node = {
        relation: expression.relation,
        segments: expression.children.map(serializeExpression),
    };
    if (expression.custom !== undefined)
        node.custom = expression.custom;
    return node;
}
function stripConditionReadMetadata(condition) {
    if ("column" in condition) {
        delete condition.normalizedValue;
        delete condition.sourceDateFormat;
        return;
    }
    if (isAggregate(condition)) {
        condition.aggregate.conditions.forEach((criterion) => stripConditionReadMetadata(criterion));
        return;
    }
    condition.filter.conditions.forEach(stripConditionReadMetadata);
}
function stripNodeReadMetadata(node) {
    node.filter?.conditions.forEach(stripConditionReadMetadata);
    node.segments?.forEach(stripNodeReadMetadata);
}
function flattenCards(expression, result = []) {
    if (isCard(expression))
        result.push(expression);
    else
        for (const child of expression.children)
            flattenCards(child, result);
    return result;
}
function findParent(group, cardId) {
    for (let index = 0; index < group.children.length; index += 1) {
        const child = group.children[index];
        if (isCard(child) && child.id === cardId)
            return { parent: group, index };
        if (!isCard(child)) {
            const found = findParent(child, cardId);
            if (found !== undefined)
                return found;
        }
    }
    return undefined;
}
function relationBetween(group, leftId, rightId) {
    const childIndexContaining = (id) => group.children.findIndex((child) => flattenCards(child).some((card) => card.id === id));
    const leftIndex = childIndexContaining(leftId);
    const rightIndex = childIndexContaining(rightId);
    if (leftIndex === -1 || rightIndex === -1)
        return undefined;
    if (leftIndex !== rightIndex)
        return group.relation;
    const child = group.children[leftIndex];
    return isCard(child) ? undefined : relationBetween(child, leftId, rightId);
}
function canonicalTree(cards, relations) {
    if (cards.length === 0)
        return { kind: "group", relation: "AND", children: [] };
    if (cards.length === 1)
        return { kind: "group", relation: "AND", children: [cards[0]] };
    const terms = [];
    let current = [cards[0]];
    const flush = () => {
        terms.push(current.length === 1
            ? current[0]
            : { kind: "group", relation: "AND", children: [...current] });
        current = [];
    };
    for (let index = 1; index < cards.length; index += 1) {
        if (relations[index - 1] === "AND")
            current.push(cards[index]);
        else {
            flush();
            current = [cards[index]];
        }
    }
    flush();
    if (terms.length === 1 && !isCard(terms[0]))
        return terms[0];
    if (terms.length === 1)
        return { kind: "group", relation: "AND", children: terms };
    return { kind: "group", relation: "OR", children: terms };
}
function normalizeGroup(group, isRoot = true) {
    const normalized = [];
    for (const child of group.children) {
        if (isCard(child)) {
            normalized.push(child);
            continue;
        }
        const next = normalizeGroup(child, false);
        if (next.children.length === 0)
            continue;
        if (next.children.length === 1 && !next.custom)
            normalized.push(next.children[0]);
        else if (next.relation === group.relation && !next.custom && !group.custom)
            normalized.push(...next.children);
        else
            normalized.push(next);
    }
    group.children = normalized;
    if (isRoot && group.children.length === 1 && !isCard(group.children[0]) && !group.children[0].custom) {
        return group.children[0];
    }
    return group;
}
function hasCustomGroup(group) {
    return Boolean(group.custom) || group.children.some((child) => !isCard(child) && hasCustomGroup(child));
}
export class SegmentTree {
    branches;
    cards = new Map();
    conditions = new Map();
    counters = { card: 0, condition: 0, aggregate: 0, criterion: 0 };
    extras;
    constructor(model) {
        const seed = model === undefined
            ? { include: { relation: "AND", segments: [] }, exclude: { relation: "AND", segments: [] }, parameters: [] }
            : clone(model);
        const { include: _include, exclude: _exclude, ...extras } = seed;
        this.extras = extras;
        this.branches = {
            include: this.parseBranch(seed.include, "include"),
            exclude: this.parseBranch(seed.exclude, "exclude"),
        };
    }
    snapshot() {
        return clone({
            branches: this.branches,
            cards: this.cards,
            conditions: this.conditions,
            counters: this.counters,
            extras: this.extras,
        });
    }
    restore(snapshot) {
        this.cards.clear();
        this.conditions.clear();
        this.branches = snapshot.branches;
        for (const [id, location] of snapshot.cards)
            this.cards.set(id, location);
        for (const [id, entry] of snapshot.conditions)
            this.conditions.set(id, entry);
        this.counters = snapshot.counters;
        this.extras = snapshot.extras;
    }
    toModel() {
        const model = {
            ...clone(this.extras),
            include: this.serializeBranch(this.branches.include),
            exclude: this.serializeBranch(this.branches.exclude),
        };
        model.include?.segments.forEach(stripNodeReadMetadata);
        model.exclude?.segments.forEach(stripNodeReadMetadata);
        return model;
    }
    cardRef(id) {
        this.requireCard(id);
        return makeRef("card", id);
    }
    conditionRef(entry) {
        return makeRef(entry.kind, entry.id);
    }
    allCards(branch) {
        const branches = branch === undefined ? ["include", "exclude"] : [branch];
        return branches.flatMap((branchName) => flattenCards(this.branches[branchName]).map((card) => {
            const location = this.cards.get(card.id);
            if (location === undefined)
                throw new SegmentSdkError(`Card ${card.id} is missing from the internal index.`);
            return location;
        }));
    }
    allConditions() {
        const ordered = [];
        for (const { card } of this.allCards()) {
            for (const condition of card.filter.conditions) {
                const top = [...this.conditions.values()].find((entry) => entry.cardId === card.id && entry.kind !== "criterion" && entry.value === condition);
                if (top === undefined)
                    continue;
                ordered.push(top);
                if (top.kind === "aggregate" && isAggregate(condition)) {
                    for (const criterion of condition.aggregate.conditions) {
                        const child = [...this.conditions.values()].find((entry) => entry.aggregateId === top.id && entry.value === criterion);
                        if (child !== undefined)
                            ordered.push(child);
                    }
                }
            }
        }
        return ordered;
    }
    getCard(id) {
        return this.requireCard(id);
    }
    getCondition(id) {
        const entry = this.conditions.get(id);
        if (entry === undefined)
            throw new SegmentSdkError(`Condition reference ${id} is stale or unknown.`, [issue("REFERENCE_NOT_FOUND", `Condition ${id} was not found.`)]);
        return entry;
    }
    addCard(branch, filter, relation) {
        const card = { kind: "card", id: this.nextId("card"), filter: clone(filter) };
        const root = this.branches[branch];
        if (root.children.length === 0) {
            root.children.push(card);
        }
        else if (root.relation === relation) {
            root.children.push(card);
        }
        else if (root.relation === "OR" && relation === "AND" && root.children.length > 0) {
            const lastIndex = root.children.length - 1;
            const last = root.children[lastIndex];
            if (!isCard(last) && last.relation === "AND" && !last.custom)
                last.children.push(card);
            else
                root.children[lastIndex] = { kind: "group", relation: "AND", children: [last, card] };
        }
        else if (root.children.length <= 1) {
            root.relation = relation;
            root.children.push(card);
        }
        else {
            this.branches[branch] = { kind: "group", relation, children: [root, card] };
        }
        this.cards.set(card.id, { card, branch });
        return makeRef("card", card.id);
    }
    copyCard(sourceId, relation = "OR") {
        const sourceLocation = this.requireCard(sourceId);
        const found = findParent(this.branches[sourceLocation.branch], sourceId);
        if (found === undefined)
            throw new SegmentSdkError("Card reference is stale.");
        const copy = {
            kind: "card",
            id: this.nextId("card"),
            filter: clone(sourceLocation.card.filter),
        };
        if (found.parent.relation === relation) {
            found.parent.children.splice(found.index + 1, 0, copy);
        }
        else {
            found.parent.children[found.index] = {
                kind: "group",
                relation,
                children: [found.parent.children[found.index], copy],
            };
        }
        this.cards.set(copy.id, { card: copy, branch: sourceLocation.branch });
        for (const condition of copy.filter.conditions)
            this.registerTopLevelCondition(copy.id, condition);
        this.branches[sourceLocation.branch] = normalizeGroup(this.branches[sourceLocation.branch]);
        return this.cardRef(copy.id);
    }
    cardConditionRefs(cardId) {
        const { card } = this.requireCard(cardId);
        const entries = new Map();
        for (const entry of this.conditions.values()) {
            if (entry.cardId === cardId && entry.kind !== "criterion" && !entries.has(entry.value)) {
                entries.set(entry.value, entry);
            }
        }
        return card.filter.conditions.flatMap((condition) => {
            const entry = entries.get(condition);
            return entry === undefined ? [] : [this.conditionRef(entry)];
        });
    }
    updateCard(id, patch) {
        const location = this.requireCard(id);
        if (patch.conditionRelation !== undefined)
            location.card.filter.relation = patch.conditionRelation;
        if (patch.negated !== undefined)
            location.card.filter.negation = patch.negated;
        if (patch.relation !== undefined)
            this.changeRelationBefore(location.branch, id, patch.relation);
    }
    addTopLevelCondition(cardId, condition) {
        const { card } = this.requireCard(cardId);
        card.filter.conditions.push(condition);
        return this.registerTopLevelCondition(cardId, condition);
    }
    addCriterion(aggregateId, criterion) {
        const aggregateEntry = this.getCondition(aggregateId);
        const aggregateValue = aggregateEntry.value;
        if (aggregateEntry.kind !== "aggregate" || !isAggregate(aggregateValue)) {
            throw new SegmentSdkError("Criteria can only be added inside an aggregate.");
        }
        aggregateValue.aggregate.conditions.push(criterion);
        const entry = {
            id: this.nextId("criterion"),
            kind: "criterion",
            value: criterion,
            cardId: aggregateEntry.cardId,
            aggregateId,
        };
        this.conditions.set(entry.id, entry);
        return entry;
    }
    replaceCondition(id, next) {
        const entry = this.getCondition(id);
        if (entry.kind === "criterion") {
            const aggregate = this.getCondition(entry.aggregateId ?? "");
            const aggregateValue = aggregate.value;
            if (!isAggregate(aggregateValue))
                throw new SegmentSdkError("Criterion parent is invalid.");
            const index = aggregateValue.aggregate.conditions.indexOf(entry.value);
            if (index < 0 || "aggregate" in next)
                throw new SegmentSdkError("Criterion replacement is invalid.");
            aggregateValue.aggregate.conditions[index] = next;
            entry.value = next;
            return;
        }
        const card = this.requireCard(entry.cardId).card;
        const index = card.filter.conditions.indexOf(entry.value);
        if (index < 0)
            throw new SegmentSdkError("Condition reference is stale.");
        const preservedCriteria = entry.kind === "aggregate"
            ? [...this.conditions.values()].filter((candidate) => candidate.aggregateId === entry.id)
            : [];
        card.filter.conditions[index] = next;
        this.unregisterCondition(entry);
        this.registerTopLevelCondition(entry.cardId, next, id, preservedCriteria);
    }
    removeCard(id) {
        const location = this.requireCard(id);
        const found = findParent(this.branches[location.branch], id);
        if (found === undefined)
            throw new SegmentSdkError("Card reference is stale.");
        found.parent.children.splice(found.index, 1);
        this.branches[location.branch] = normalizeGroup(this.branches[location.branch]);
        for (const entry of [...this.conditions.values()]) {
            if (entry.cardId === id)
                this.conditions.delete(entry.id);
        }
        this.cards.delete(id);
    }
    removeCondition(id) {
        const entry = this.getCondition(id);
        if (entry.kind === "criterion") {
            const aggregate = this.getCondition(entry.aggregateId ?? "");
            const aggregateValue = aggregate.value;
            if (!isAggregate(aggregateValue))
                throw new SegmentSdkError("Criterion parent is invalid.");
            const index = aggregateValue.aggregate.conditions.indexOf(entry.value);
            if (index >= 0)
                aggregateValue.aggregate.conditions.splice(index, 1);
            this.conditions.delete(id);
            return;
        }
        const card = this.requireCard(entry.cardId).card;
        const index = card.filter.conditions.indexOf(entry.value);
        if (index >= 0)
            card.filter.conditions.splice(index, 1);
        this.unregisterCondition(entry);
    }
    formula(branch, labelOffset = 0) {
        const labels = new Map();
        flattenCards(this.branches[branch]).forEach((card, index) => labels.set(card.id, this.cardLabel(index + labelOffset)));
        const render = (expression, parentRelation) => {
            if (isCard(expression))
                return labels.get(expression.id) ?? "?";
            const body = expression.children.map((child) => render(child, expression.relation)).join(` ${expression.relation} `);
            return parentRelation !== undefined && parentRelation !== expression.relation && expression.children.length > 1
                ? `(${body})`
                : body;
        };
        return render(this.branches[branch]);
    }
    parseBranch(branch, branchName) {
        const root = {
            kind: "group",
            relation: branch?.relation ?? "AND",
            children: [],
            custom: branch?.custom,
        };
        for (const node of branch?.segments ?? [])
            root.children.push(this.parseNode(node, branchName));
        return root;
    }
    parseNode(node, branch) {
        if (node.filter !== null && node.filter !== undefined) {
            const card = { kind: "card", id: this.nextId("card"), filter: clone(node.filter) };
            this.cards.set(card.id, { card, branch });
            for (const condition of card.filter.conditions)
                this.registerTopLevelCondition(card.id, condition);
            return card;
        }
        return {
            kind: "group",
            relation: node.relation ?? "AND",
            children: (node.segments ?? []).map((child) => this.parseNode(child, branch)),
            custom: node.custom,
        };
    }
    serializeBranch(group) {
        const branch = {
            relation: group.relation,
            segments: group.children.map(serializeExpression),
        };
        if (group.custom !== undefined)
            branch.custom = group.custom;
        return branch;
    }
    registerTopLevelCondition(cardId, condition, forcedId, preservedCriteria = []) {
        const aggregate = isAggregate(condition);
        const entry = {
            id: forcedId ?? this.nextId(aggregate ? "aggregate" : "condition"),
            kind: aggregate ? "aggregate" : "condition",
            value: condition,
            cardId,
        };
        this.conditions.set(entry.id, entry);
        if (aggregate) {
            const remaining = [...preservedCriteria];
            for (const criterion of condition.aggregate.conditions) {
                const preservedIndex = remaining.findIndex((candidate) => sameJson(candidate.value, criterion));
                const preserved = preservedIndex >= 0 ? remaining.splice(preservedIndex, 1)[0] : undefined;
                const criterionEntry = {
                    id: preserved?.id ?? this.nextId("criterion"),
                    kind: "criterion",
                    value: criterion,
                    cardId,
                    aggregateId: entry.id,
                };
                this.conditions.set(criterionEntry.id, criterionEntry);
            }
        }
        return entry;
    }
    unregisterCondition(entry) {
        if (entry.kind === "aggregate") {
            for (const child of [...this.conditions.values()]) {
                if (child.aggregateId === entry.id)
                    this.conditions.delete(child.id);
            }
        }
        this.conditions.delete(entry.id);
    }
    requireCard(id) {
        const location = this.cards.get(id);
        if (location === undefined)
            throw new SegmentSdkError(`Card reference ${id} is stale or unknown.`, [issue("REFERENCE_NOT_FOUND", `Card ${id} was not found.`)]);
        return location;
    }
    changeRelationBefore(branch, cardId, relation) {
        const root = this.branches[branch];
        if (hasCustomGroup(root))
            throw new SegmentSdkError("Relation changes on custom formulas are not supported by the card editor.");
        const cards = flattenCards(root);
        const index = cards.findIndex((card) => card.id === cardId);
        if (index <= 0)
            throw new SegmentSdkError("The first card has no preceding relation to update.", [issue("FIRST_CARD_RELATION", "relation applies only to cards after the first card.")]);
        const relations = [];
        for (let cursor = 1; cursor < cards.length; cursor += 1) {
            const current = relationBetween(root, cards[cursor - 1].id, cards[cursor].id);
            if (current === undefined)
                throw new SegmentSdkError("Could not derive the card formula relation.");
            relations.push(current);
        }
        relations[index - 1] = relation;
        this.branches[branch] = canonicalTree(cards, relations);
    }
    nextId(kind) {
        this.counters[kind] += 1;
        return `${kind}-${this.counters[kind]}`;
    }
    cardLabel(index) {
        const letter = String.fromCharCode(65 + (index % 26));
        const cycle = Math.floor(index / 26);
        return cycle === 0 ? letter : `${letter}${cycle + 1}`;
    }
}
//# sourceMappingURL=tree.js.map