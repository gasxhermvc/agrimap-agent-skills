# Legacy response structure reference

Response-format guidance only. These examples use JSON with comments and ellipses to show shape; they are not parseable fixtures and must not be fed to JSON tooling. Each fenced fragment is preserved verbatim from its original extraction; only this Markdown wrapper is new.

## Object response

```jsonc
// General response structure or one object response structure
// have data
{
  "data": {...},
  "message": "string"
}

// null data
{
  "data": null,
  "message": "string"
}
```

## List response

```jsonc
// List response structure
// have data
{
  "data": [{...}, {...}, ..., {...}],
  "message": "string"
}

// empty list data
{
  "data": [],
  "message": "string"
}
```

## Complex response

```jsonc
// Complex response structure
{
  "data": {
    "source_info": {...},
    "widget_list": []
  },
  "message": "string"
}
```

## Mutation response

```jsonc
// for insert / update / delete response structure
// have data
{
  "data": {
    "success": true
  },
  "message": "string"
}
```

## Error response

```jsonc
// error response structure
{
  "status_code": 404,
  "code": "string",
  "message": "string"
}
```
