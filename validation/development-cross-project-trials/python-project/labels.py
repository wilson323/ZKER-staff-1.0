def parse_labels(items):
    labels = []
    seen = set()
    for value in items:
        label = value.strip()
        if label and label not in seen:
            labels.append(label)
            seen.add(label)
    return labels
