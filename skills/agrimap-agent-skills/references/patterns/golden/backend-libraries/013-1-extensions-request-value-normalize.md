# HTTP Request Value Extensions

ตัวช่วยอ่านค่าจาก HTTP request (Cookie, Header, Query, Form, JSON body) แบบ normalize
พร้อมค่าคงที่ชื่อ Cookie/Parameter/Header มาตรฐานของ AgriMap และตัว resolve `device_id`
ทุกตัวเป็น static class ใน namespace `AgriMap.Platform.Extensions` ไม่ต้องลงทะเบียน DI

```csharp
using AgriMap.Platform.Extensions;
```

ประกอบด้วย 3 คลาส:

- `HttpRequestValueExtensions` — extension methods อ่านค่าจาก `HttpRequest` แบบ normalize
  และ helper `FirstNotBlank` สำหรับ resolve ค่าตามลำดับความสำคัญ
- `ClientRequestResolverExtensions` — ค่าคงที่ชื่อ `Cookies` / `Parameters` / `Headers`
  ที่ใช้ร่วมกันทุก service
- `ClientTraceHttpContextExtensions` — `ResolveDeviceIdAsync` บน `HttpContext`

## แนวคิด normalize

ทุกเมธอดอ่านค่าใช้กติกาเดียวกัน: ค่า `null`, empty, หรือ whitespace ล้วนถือว่า "ไม่มีค่า"
และคืน `null`; ค่าที่พบจะถูก `Trim()` ให้เสมอ ผู้เรียกจึงเช็คแค่ `is not null`
โดยไม่ต้อง `string.IsNullOrWhiteSpace` ซ้ำ

เมื่อค่าเดียวกันมาจากหลาย request source ให้ `FirstNotBlank` เลือกค่าแรกตามลำดับคงที่:

```text
Cookie (highest) -> Header -> QueryString (lowest)
```

Form/JSON body เป็น fallback หลังแหล่ง sync เท่านั้น หาก resolver นั้นรองรับ body

## API

```csharp
// HttpRequestValueExtensions
string? ReadCookie(this HttpRequest request, string cookieName);
string? ReadHeader(this HttpRequest request, string headerName);
string? ReadQuery(this HttpRequest request, string parameterName);
ValueTask<string?> ReadFormAsync(this HttpRequest request, string fieldName,
    CancellationToken cancellationToken = default);
ValueTask<string?> ReadBodyAsStringAsync(this HttpRequest request,
    CancellationToken cancellationToken = default);
ValueTask<T?> ReadJsonBodyAsync<T>(this HttpRequest request,
    JsonSerializerOptions? options = null,
    CancellationToken cancellationToken = default);
ValueTask<string?> ReadJsonPropertyAsync(this HttpRequest request,
    string propertyName, CancellationToken cancellationToken = default);
string? FirstNotBlank(params string?[] values);

// ClientTraceHttpContextExtensions
ValueTask<string> ResolveDeviceIdAsync(this HttpContext httpContext,
    string? requestDeviceId = null,
    CancellationToken cancellationToken = default);
```

ทุกเมธอด guard อินพุตด้วย `ArgumentNullException.ThrowIfNull` และ
`ArgumentException.ThrowIfNullOrWhiteSpace` ก่อนทำงานเสมอ

## อ่านค่าจาก Cookie / Header / Query / Form

```csharp
string? traceId = Request.ReadCookie(ClientRequestResolverExtensions.Cookies.AgmTraceId);
string? clientId = Request.ReadHeader(ClientRequestResolverExtensions.Headers.AgmClientId);
string? state = Request.ReadQuery(ClientRequestResolverExtensions.Parameters.State);
string? deviceId = await Request.ReadFormAsync("device_id", cancellationToken);
```

- `ReadHeader` / `ReadQuery` ใช้ค่าแรกเมื่อมีหลายค่า (`values.FirstOrDefault()`)
- `ReadFormAsync` คืน `null` ทันทีเมื่อ request ไม่ใช่ form content type
  (`!request.HasFormContentType`) โดยไม่พยายามอ่าน body
- อ้างชื่อ cookie/header/parameter ผ่านค่าคงที่ใน `ClientRequestResolverExtensions`
  เสมอ ห้าม hardcode string ซ้ำในโค้ดฝั่ง service

## อ่าน JSON body

`ReadBodyAsStringAsync` เรียก `request.EnableBuffering()` และ reset `Body.Position`
ทั้งก่อนและหลังอ่าน — body จึงยังอ่านซ้ำได้โดย model binding หรือ middleware ตัวถัดไป:

```csharp
string? body = await Request.ReadBodyAsStringAsync(cancellationToken);

TokenRequestDto? dto =
    await Request.ReadJsonBodyAsync<TokenRequestDto>(
        cancellationToken: cancellationToken
    );

// อ่าน property เดียวจาก JSON object โดยไม่ bind เป็น DTO
string? clientId =
    await Request.ReadJsonPropertyAsync("client_id", cancellationToken);
```

พฤติกรรมของ `ReadJsonPropertyAsync`:

- จับคู่ชื่อ property แบบ **case-insensitive** (`client_id` เจอ `Client_Id`)
- อ่านเฉพาะ property ระดับบนสุด; ถ้า root ไม่ใช่ JSON object คืน `null`
- ค่า string ถูก normalize; ค่าชนิดอื่น (number, bool) คืนเป็น raw text เช่น `"42"`
- body ที่ parse ไม่ได้ (`JsonException`) คืน `null` ไม่ throw

## FirstNotBlank — resolve ค่าตามลำดับความสำคัญ

`FirstNotBlank` คืนค่าตัวแรกที่ไม่ blank (trim แล้ว) หรือ `null` เมื่อทุกค่า blank
ใช้เป็น pattern หลักเมื่อค่าหนึ่งมาได้จากหลายแหล่งและต้องการ fallback ตามลำดับ
เรียกแบบระบุชื่อคลาสเต็ม (static call) และจัดรูปแบบ argument บรรทัดละตัว:

```csharp
[HttpPost("token")]
public async Task<IActionResult> Token(
    TokenRequestDto request,
    CancellationToken cancellationToken)
{
    var client = await _clientResolver.ResolveAsync(
        HttpContext,
        cancellationToken
    );

    var clientId =
        HttpRequestValueExtensions.FirstNotBlank(
            request.ClientId,
            client.ClientId
        );

    var grantType =
        HttpRequestValueExtensions.FirstNotBlank(
            request.GrantType,
            client.GrantType
        );

    return Ok();
}
```

## ResolveDeviceIdAsync

resolve `device_id` ตามลำดับ:

```text
Request DTO -> Cookie (AgmTraceId) -> Header (agm-device-id) -> Query (device_id) -> Form (device_id)
```

เมื่อไม่พบจากทุกแหล่ง สร้าง GUID ใหม่ format `N` (ไม่มี dash):

```csharp
var deviceId = await HttpContext.ResolveDeviceIdAsync(
    request.DeviceId,
    cancellationToken
);
```

Form ถูกอ่านเป็นลำดับสุดท้ายเท่านั้น — แหล่ง sync (DTO/Cookie/Header/Query) ถูกเช็คให้ครบ
ด้วย `FirstNotBlank` ก่อน เพื่อเลี่ยงการอ่าน request body โดยไม่จำเป็น

## ค่าคงที่ ClientRequestResolverExtensions

```csharp
// Cookies
".AgmSession", "AgmAnonymousSession", "AgmLoginContextId", "AgmTraceId"

// Parameters (query/form, รูปแบบ snake_case ตาม OAuth)
"client_id", "client_secret", "code", "app_id", "provider", "purpose", "prompt",
"code_challenge", "code_challenge_method", "code_verifier", "redirect_uri",
"scope", "state", "auto_login_token", "post_logout_redirect_uri",
"refresh_token", "access_token", "grant_type"

// Headers (รูปแบบ kebab-case ตัวพิมพ์เล็ก prefix agm-)
"agm-client-id", "agm-device-id", "agm-trace-id", "agm-system-id", "agm-platform-code",
"agm-app-version", "agm-app-id", "agm-token", "authorization"
```

การอ้างอิงในโค้ด:

```csharp
ClientRequestResolverExtensions.Cookies.AgmTraceId
ClientRequestResolverExtensions.Parameters.ClientId
ClientRequestResolverExtensions.Headers.AgmClientId
```

## สไตล์การเขียนที่ต้องตาม

โค้ดใหม่ที่ใช้หรือขยายโมดูลนี้ต้องคงสไตล์เดียวกับตัวอย่างข้างต้น:

- method signature และ call ที่มีหลาย argument: แตกบรรทัดละ argument
  และวางวงเล็บปิดบรรทัดของตัวเอง
- เรียก `FirstNotBlank` แบบ static เต็มชื่อคลาส
  (`HttpRequestValueExtensions.FirstNotBlank(...)`) ไม่ใช่ extension form
- guard อินพุตด้วย `ArgumentNullException.ThrowIfNull` /
  `ArgumentException.ThrowIfNullOrWhiteSpace` ที่ต้นเมธอด
- เมธอดอ่านค่าคืน `string?` ที่ normalize แล้วเสมอ (blank → `null`, trim)
- ส่ง `CancellationToken` ต่อทุกชั้นของ async call

## ข้อควรทราบ

- ผลลัพธ์ `null` แปลว่า "ไม่มีค่า" เสมอ ผู้เรียกเช็ค `is not null` แล้วใช้ได้ทันที
- `ReadBodyAsStringAsync` เปิด buffering ให้เอง แต่ควรเรียกก่อน model binding
  จะปลอดภัยที่สุดเมื่อ endpoint ไม่ได้ bind body เป็น DTO อยู่แล้ว
- `ReadJsonBodyAsync<T>` ใช้ค่าเริ่มต้นของ `System.Text.Json` เมื่อไม่ส่ง `options`;
  การจับคู่ชื่อ property เป็น case-sensitive ต่างจาก `ReadJsonPropertyAsync`
- `ResolveDeviceIdAsync` คืนค่าเสมอ (non-nullable) — อย่าเช็ค null ซ้ำ
- ใช้ `AgmLoginContextId` เป็นชื่อ canonical ของ login-context cookie
- คง mapping `AgmTraceId` cookie เป็นแหล่ง device ID ตามลำดับข้างต้น
- อย่าเพิ่มชื่อ cookie/header/parameter ใหม่แบบ hardcode ใน service;
  เพิ่มเป็นค่าคงที่ใน `ClientRequestResolverExtensions` ก่อนแล้วอ้างอิงจากที่เดียว
