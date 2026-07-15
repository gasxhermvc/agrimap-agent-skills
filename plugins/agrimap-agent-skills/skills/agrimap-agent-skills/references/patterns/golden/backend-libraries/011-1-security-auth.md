# Security Auth

โฟลเดอร์นี้รวมฟังก์ชัน authentication และ authorization ของ platform
ทั้งฝั่ง token/session, API authentication scheme, authorization middleware, attribute gate,
และ auth flow แบบ one-time artifact

## ภาพรวม

- `AuthenticationTokenResolver` อ่าน token จาก header, query string, หรือ custom header
- `AuthService` ช่วยอ่าน access token, JWT payload, user/session identity, และ role
- `AuthorizationMiddleware` ตรวจ JWT และ user token ก่อนปล่อย request ต่อ
- `AuthGateAttribute` ใช้ป้องกัน endpoint ด้วย user role หรือ API key
- `AuthenticationApiHandler` และ `AuthenticationFlowHandler` คือ authentication handlers ที่ผูกกับ ASP.NET authentication scheme
- `Flow/` คือ core สำหรับ state, authorization code, verification grant, และ registration grant

## การลงทะเบียน

ถ้าต้องการใช้บริการ auth พื้นฐาน:

```csharp
builder.Services.AddAuth();
```

ถ้าต้องการตั้งค่า authentication scheme สำหรับ API:

```csharp
builder.Services.AddAgriMapApiAuthentication();
```

## `AddAuth()`

`AddAuth()` ลงทะเบียนบริการหลักดังนี้:

- `IUserTokenRepository -> UserTokenRepository`
- `IUserInfoRepository -> UserInfoRepository`
- `IAuthService -> AuthService`
- `IAuthFlowCoreService -> AuthFlowCoreService`
- `AuthenticationTokenResolverOptions` จาก section `AuthenticationTokenResolver`
- `AuthFlowOptions` จาก section `AuthFlow`
- `IHttpContextAccessor`

## Token resolution

`AuthenticationTokenResolver` อ่าน token ตามลำดับนี้:

1. `Authorization: Bearer {token}`
2. query string `token` ถ้า path ไม่อยู่ใน skip list
3. custom header `token`

`AuthenticationTokenResolverOptions.QueryTokenSkipPathPrefixes` ใช้คุม path ที่ไม่ควรอ่าน token จาก query string

## `AuthService`

`AuthService` ใช้สำหรับอ่านข้อมูลจาก request ปัจจุบัน:

- `GetAccessToken()`
- `GetJwtPayload()`
- `UserId()`
- `Username()`
- `GetNonce()`
- `IsAdministrator()`

ลำดับ fallback ของ `UserId()` และ `Username()` คือ:

1. claim ที่อยู่ใน `HttpContext.User`
2. `SessionData` ที่เก็บไว้ใน `HttpContext.Items`
3. claim จาก JWT token แบบ raw

## `AuthorizationMiddleware`

middleware นี้จะ:

- อ่าน token จาก request ปัจจุบัน
- validate JWT ด้วย `WebServiceSettings:OAuth:Issuer` และ `WebServiceSettings:OAuth:SecretKey`
- ตรวจ `nonce`
- lookup token ในฐานข้อมูลผ่าน `IUserTokenRepository`
- ปฏิเสธ token ที่ revoked หรือใกล้หมดอายุ
- ตั้ง `HttpContext.User` เมื่อผ่าน validation

ถ้า validate ไม่ผ่าน จะโยน `AppException` พร้อมรหัส error ที่เหมาะสม

## `AuthGateAttribute`

`AuthGateAttribute` ใช้ได้ 2 โหมด:

- โหมด role: บังคับว่า user ต้อง authenticated และมี role ตามที่กำหนด
- โหมด API key: ตรวจ header `agm-api-key` เทียบกับ `system_config:{apiKeyName}`

## Session and cookie behavior

Authentication handler ใน module นี้ใช้ cookie `.AgmSession` ร่วมกับ:

- header `agm-device-id`
- header `agm-client-id`
- query `device_id`
- query `client_id`

เพื่อระบุ session key และ support session rotation

## Auth flow core

Auth flow core สำหรับ state, authorization code, verification grant, และ registration grant อธิบายไว้ใน [Auth Flow Core Handoff](./011-2-security-auth-flow.md)

## Tests

แนะนำให้มี test ครอบอย่างน้อย:

- token resolution order
- `AuthService` fallback behavior
- middleware validation success path
- auth flow state/code/grant lifecycle

