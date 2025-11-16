
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** querenhapuque
- **Date:** 2025-11-16
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** User Authentication Success
- **Test Code:** [TC001_User_Authentication_Success.py](./TC001_User_Authentication_Success.py)
- **Test Error:** Login attempts with valid credentials failed with 'Invalid login credentials' error. User cannot access protected routes. Test concludes that login with provided valid credentials is unsuccessful.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ojxmfxbflbfinodkhixk.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Erro no login: AuthApiError: Invalid login credentials
    at handleError3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6495:9)
    at async _handleRequest3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6536:5)
    at async _request (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6520:16)
    at async SupabaseAuthClient.signInWithPassword (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:8252:15)
    at async signIn (http://localhost:8084/src/contexts/AuthProvider.tsx:130:31)
    at async handleSubmit (http://localhost:8084/src/pages/Auth.tsx?t=1763263524845:59:7) (at http://localhost:8084/src/contexts/AuthProvider.tsx:134:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ojxmfxbflbfinodkhixk.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Erro no login: AuthApiError: Invalid login credentials
    at handleError3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6495:9)
    at async _handleRequest3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6536:5)
    at async _request (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6520:16)
    at async SupabaseAuthClient.signInWithPassword (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:8252:15)
    at async signIn (http://localhost:8084/src/contexts/AuthProvider.tsx:130:31)
    at async handleSubmit (http://localhost:8084/src/pages/Auth.tsx?t=1763263524845:59:7) (at http://localhost:8084/src/contexts/AuthProvider.tsx:134:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/c31bd5e5-59f8-4e3c-abdb-a1b4e5c52abb
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** User Authentication Failure with Invalid Credentials
- **Test Code:** [TC002_User_Authentication_Failure_with_Invalid_Credentials.py](./TC002_User_Authentication_Failure_with_Invalid_Credentials.py)
- **Test Error:** Login failure handling is incorrect: the page redirects to the home page without showing an error message or staying on the login page. The user cannot verify that login fails properly. Task stopped.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ojxmfxbflbfinodkhixk.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Erro no login: AuthApiError: Invalid login credentials
    at handleError3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6495:9)
    at async _handleRequest3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6536:5)
    at async _request (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6520:16)
    at async SupabaseAuthClient.signInWithPassword (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:8252:15)
    at async signIn (http://localhost:8084/src/contexts/AuthProvider.tsx:130:31)
    at async handleSubmit (http://localhost:8084/src/pages/Auth.tsx?t=1763263524845:59:7) (at http://localhost:8084/src/contexts/AuthProvider.tsx:134:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/89a75319-606f-4edc-9c07-e1034838cfb2
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** Password Recovery Flow
- **Test Code:** [TC003_Password_Recovery_Flow.py](./TC003_Password_Recovery_Flow.py)
- **Test Error:** The password recovery process was partially verified: The recovery request can be submitted once successfully, and a confirmation message indicates the recovery email is sent. However, attempts to simulate the password reset step by re-entering the email and submitting the recovery request again failed due to a persistent validation error on the email input field. Therefore, the final steps of setting a new password and verifying login with the new password could not be completed. The task is not fully finished.
Browser Console Logs:
[ERROR] Erro inesperado no reset de senha: Error: Configuração de rate limit não encontrada para operação: reset_password
    at RateLimitClient.checkRateLimit (http://localhost:8084/src/lib/rateLimitClient.ts:71:13)
    at resetPassword (http://localhost:8084/src/contexts/AuthProvider.tsx:325:53)
    at handleSubmit (http://localhost:8084/src/components/ForgotPasswordModal.tsx:46:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:3674:22)
    at Object.invokeGuardedCallbackDev (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:3699:24)
    at invokeGuardedCallback (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:3733:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:3736:33)
    at executeDispatch (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:7016:11)
    at processDispatchQueueItemsInOrder (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:7036:15)
    at processDispatchQueue (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:7045:13) (at http://localhost:8084/src/contexts/AuthProvider.tsx:354:14)
[ERROR] Erro inesperado no reset de senha: Error: Configuração de rate limit não encontrada para operação: reset_password
    at RateLimitClient.checkRateLimit (http://localhost:8084/src/lib/rateLimitClient.ts:71:13)
    at resetPassword (http://localhost:8084/src/contexts/AuthProvider.tsx:325:53)
    at handleSubmit (http://localhost:8084/src/components/ForgotPasswordModal.tsx:46:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:3674:22)
    at Object.invokeGuardedCallbackDev (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:3699:24)
    at invokeGuardedCallback (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:3733:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:3736:33)
    at executeDispatch (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:7016:11)
    at processDispatchQueueItemsInOrder (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:7036:15)
    at processDispatchQueue (http://localhost:8084/node_modules/.vite/deps/chunk-V5LT2MCF.js?v=98395c94:7045:13) (at http://localhost:8084/src/contexts/AuthProvider.tsx:354:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/445b3e8b-9e2b-455b-a3c7-5475b679431d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** Product Catalog Listing and Filtering
- **Test Code:** [TC004_Product_Catalog_Listing_and_Filtering.py](./TC004_Product_Catalog_Listing_and_Filtering.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/02ed3b69-2ad2-4a3e-8cce-4d81df57e01b
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** Add and Remove Items in Cart
- **Test Code:** [TC005_Add_and_Remove_Items_in_Cart.py](./TC005_Add_and_Remove_Items_in_Cart.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/13a2ad82-39b7-42bd-8006-32c3a960bfa9
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** Complete Checkout with Multiple Participants
- **Test Code:** [TC006_Complete_Checkout_with_Multiple_Participants.py](./TC006_Complete_Checkout_with_Multiple_Participants.py)
- **Test Error:** The checkout process partially collects customer information including name, email, country, and address fields. However, the CPF field validation fails with an invalid CPF error, and the CEP field shows a 'CEP não encontrado' error, preventing form submission. Multiple participants addition and terms acceptance steps were not completed due to these validation issues. The order summary accurately reflects the items (2 tickets) and total pricing (R$ 180,00). Additional notes field is present but was not filled. Overall, the checkout process is not fully functional as required due to validation errors blocking completion.
Browser Console Logs:
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/b9903edc-f9ee-4d3e-8ec1-e9aa57b4b7ce
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** Payment Processing via AbacatePay with QR Code Pix
- **Test Code:** [TC007_Payment_Processing_via_AbacatePay_with_QR_Code_Pix.py](./TC007_Payment_Processing_via_AbacatePay_with_QR_Code_Pix.py)
- **Test Error:** The task to verify payment generating a QR Code Pix via AbacatePay and automatic order status update is incomplete. The checkout form could not be submitted due to invalid CPF input and input restrictions on the CPF field, blocking payment initiation. Consequently, QR Code Pix generation, payment confirmation simulation, and order status update verification could not be performed.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/f932c03a-9df1-4b4b-abde-ddb8fa2ca6a6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** Webhook Processing and Order Reconciliation
- **Test Code:** [TC008_Webhook_Processing_and_Order_Reconciliation.py](./TC008_Webhook_Processing_and_Order_Reconciliation.py)
- **Test Error:** Stopped testing due to lack of access to webhook testing interface caused by empty cart and no alternative navigation. Please provide access or instructions to test webhook order updates.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/5d80a0be-fd77-419d-bbb3-17ad9b0ca7a7
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** Admin Panel: Product and Stock Management
- **Test Code:** [TC009_Admin_Panel_Product_and_Stock_Management.py](./TC009_Admin_Panel_Product_and_Stock_Management.py)
- **Test Error:** The task to verify that admins can access admin panels, view product lists, stocks, and update inventory quantities is not fully completed. Admin login attempts failed due to invalid credentials and OAuth login restrictions. The public store page shows product lists and stock information but does not allow inventory updates. Without valid admin access, the verification of admin panel functionalities could not be performed.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ojxmfxbflbfinodkhixk.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Erro no login: AuthApiError: Invalid login credentials
    at handleError3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6495:9)
    at async _handleRequest3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6536:5)
    at async _request (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6520:16)
    at async SupabaseAuthClient.signInWithPassword (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:8252:15)
    at async signIn (http://localhost:8084/src/contexts/AuthProvider.tsx:130:31)
    at async handleSubmit (http://localhost:8084/src/pages/Auth.tsx?t=1763263524845:59:7) (at http://localhost:8084/src/contexts/AuthProvider.tsx:134:16)
[WARNING] An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing. (at https://accounts.youtube.com/accounts/CheckConnection?pmpo=https%3A%2F%2Faccounts.google.com&v=-2023663657&timestamp=1763264775162:0:0)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A09872087C3A0000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at https://accounts.google.com/v3/signin/identifier?opparams=%253Fredirect_to%253Dhttp%25253A%25252F%25252Flocalhost%25253A8084%25252Fauth%25252Fcallback&dsh=S1059709327%3A1763264771668043&client_id=323119442853-h4s0cfqq2s7qtd9amlc38l41cd8jiltd.apps.googleusercontent.com&o2v=2&redirect_uri=https%3A%2F%2Fojxmfxbflbfinodkhixk.supabase.co%2Fauth%2Fv1%2Fcallback&response_type=code&scope=email+profile&service=lso&state=eyJhbGciOiJIUzI1NiIsImtpZCI6Im9OTjZOaS81clBiRitPMGMiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3NjMyNjUwNzAsInNpdGVfdXJsIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgyIiwiaWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJmdW5jdGlvbl9ob29rcyI6bnVsbCwicHJvdmlkZXIiOiJnb29nbGUiLCJyZWZlcnJlciI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4NC9hdXRoL2NhbGxiYWNrIiwiZmxvd19zdGF0ZV9pZCI6ImI3MWZhNDJmLWEyOGQtNDZkMy1hYjYyLTZiOWMxYTA3MDk4ZiJ9.J0BFUWJowwine3vBVOuDmZxyQlOPcxGsANkXHFC7Eq0&flowName=GeneralOAuthFlow&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAMGF9la206dQluTdEnD--4eSAEkwpW6dbjztb3aNSj6VyEl7QAUycsX8H9JLbVwnxLXcE42uPR-xbTlqlWxs-1uYQchxvjUeYhpxOCzyBpv4WOGtcIzziEnKKiVFVMtY-BJUVJA2_uDeCtn3Bjfhp7EwuE-b7RxOE1ELEphZzQXp_Xqyu_NPD50xVIoPFfkUhyXUHIKPw-SXU1NGExP3KqcvOb69L_ZyZYTUQCnOzjMrFxBshrcCwOxm7JBdr2czn7kBQOkR-vvU3fKbQKhAJpmPo2v2aOhDRIQsy0yKL751aN-itYHNBWBQaxe2n-XNkOnH6lH9DtHL7lTqGPVFkY8dMTgXhdmJKnqP9yKFlnFsy_2lkshVT4I2pi6S6CZqNX5AqBI7FOI0Xblh5d4jCtufLy52sSBBYtL26WzP-HTzxXm869QglO7eo2TjQru_dKVV3FaW4h2O7RlPRWa62fPNUQuHT7HrZqdiprJafcs6kHYEm0%26flowName%3DGeneralOAuthFlow%26as%3DS1059709327%253A1763264771668043%26client_id%3D323119442853-h4s0cfqq2s7qtd9amlc38l41cd8jiltd.apps.googleusercontent.com%23&app_domain=https%3A%2F%2Fojxmfxbflbfinodkhixk.supabase.co&rart=ANgoxcezlyJG1UliZO8W-gd5wLjqadoUzyKyq9pDHUJfeIliF8YnCg3sZl27PV5wbbjnKEQU4HC9Vf4iPLneEGJQ6bvIWATWQAa8huTu16g9RcvIldrG9hI:0:0)
[WARNING] An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing. (at https://accounts.youtube.com/accounts/CheckConnection?pmpo=https%3A%2F%2Faccounts.google.com&v=-59890031&timestamp=1763264813244:0:0)
[WARNING] An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing. (at https://accounts.youtube.com/accounts/CheckConnection?pmpo=https%3A%2F%2Faccounts.google.com&v=-1449428021&timestamp=1763264841735:0:0)
[WARNING] An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing. (at https://accounts.youtube.com/accounts/CheckConnection?pmpo=https%3A%2F%2Faccounts.google.com&v=331011423&timestamp=1763264855599:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ojxmfxbflbfinodkhixk.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Erro no login: AuthApiError: Invalid login credentials
    at handleError3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6495:9)
    at async _handleRequest3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6536:5)
    at async _request (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6520:16)
    at async SupabaseAuthClient.signInWithPassword (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:8252:15)
    at async signIn (http://localhost:8084/src/contexts/AuthProvider.tsx:130:31)
    at async handleSubmit (http://localhost:8084/src/pages/Auth.tsx?t=1763263524845:59:7) (at http://localhost:8084/src/contexts/AuthProvider.tsx:134:16)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/60931f32-8502-42eb-b184-f6a77717d0e6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** Admin Panel: Orders and Sales Dashboard
- **Test Code:** [TC010_Admin_Panel_Orders_and_Sales_Dashboard.py](./TC010_Admin_Panel_Orders_and_Sales_Dashboard.py)
- **Test Error:** Unable to verify that admins can view recent orders, sales performance, and usage statistics in real-time on dedicated dashboards because all attempts to login as admin failed due to invalid credentials. No alternative access to admin dashboard was found on the site. Please provide valid admin credentials or alternative access method to proceed with verification.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ojxmfxbflbfinodkhixk.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Erro no login: AuthApiError: Invalid login credentials
    at handleError3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6495:9)
    at async _handleRequest3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6536:5)
    at async _request (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6520:16)
    at async SupabaseAuthClient.signInWithPassword (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:8252:15)
    at async signIn (http://localhost:8084/src/contexts/AuthProvider.tsx:130:31)
    at async handleSubmit (http://localhost:8084/src/pages/Auth.tsx?t=1763263524845:59:7) (at http://localhost:8084/src/contexts/AuthProvider.tsx:134:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ojxmfxbflbfinodkhixk.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Erro no login: AuthApiError: Invalid login credentials
    at handleError3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6495:9)
    at async _handleRequest3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6536:5)
    at async _request (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6520:16)
    at async SupabaseAuthClient.signInWithPassword (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:8252:15)
    at async signIn (http://localhost:8084/src/contexts/AuthProvider.tsx:130:31)
    at async handleSubmit (http://localhost:8084/src/pages/Auth.tsx?t=1763263524845:59:7) (at http://localhost:8084/src/contexts/AuthProvider.tsx:134:16)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ojxmfxbflbfinodkhixk.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Erro no login: AuthApiError: Invalid login credentials
    at handleError3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6495:9)
    at async _handleRequest3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6536:5)
    at async _request (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6520:16)
    at async SupabaseAuthClient.signInWithPassword (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:8252:15)
    at async signIn (http://localhost:8084/src/contexts/AuthProvider.tsx:130:31)
    at async handleSubmit (http://localhost:8084/src/pages/Auth.tsx?t=1763263524845:59:7) (at http://localhost:8084/src/contexts/AuthProvider.tsx:134:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/f0f46a49-5449-4de9-9101-3b17f4252050
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011
- **Test Name:** Realtime Synchronization and Offline-First Functionality
- **Test Code:** [TC011_Realtime_Synchronization_and_Offline_First_Functionality.py](./TC011_Realtime_Synchronization_and_Offline_First_Functionality.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/8dd10976-f066-4dcf-a4d0-e3e46b69f7e2
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012
- **Test Name:** UI Responsiveness Across Devices
- **Test Code:** [TC012_UI_Responsiveness_Across_Devices.py](./TC012_UI_Responsiveness_Across_Devices.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/83857876-1ff2-4dbf-9417-6530470fe68d
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013
- **Test Name:** Security: Protected Route Access Control
- **Test Code:** [TC013_Security_Protected_Route_Access_Control.py](./TC013_Security_Protected_Route_Access_Control.py)
- **Test Error:** The task to verify that protected routes require authentication and redirect unauthorized users to login is partially completed. Attempts to access protected routes without login resulted mostly in 404 errors or accessible pages without redirection to login. The 'Ingressos' and 'Checkout' pages are accessible without login, with checkout requiring items in cart but not authentication redirect. Login attempts failed due to invalid credentials, so authenticated access to protected routes could not be verified. The logout route was not available to test session clearing. Therefore, no conclusive evidence was found that protected routes enforce authentication and redirect unauthorized users to login. Further testing with valid credentials and confirmed protected routes is needed for full verification.
Browser Console Logs:
[ERROR] 404 Error: User attempted to access non-existent route: /protected-route (at http://localhost:8084/src/pages/NotFound.tsx:23:12)
[ERROR] 404 Error: User attempted to access non-existent route: /protected-route (at http://localhost:8084/src/pages/NotFound.tsx:23:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ojxmfxbflbfinodkhixk.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Erro no login: AuthApiError: Invalid login credentials
    at handleError3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6495:9)
    at async _handleRequest3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6536:5)
    at async _request (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6520:16)
    at async SupabaseAuthClient.signInWithPassword (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:8252:15)
    at async signIn (http://localhost:8084/src/contexts/AuthProvider.tsx:130:31)
    at async handleSubmit (http://localhost:8084/src/pages/Auth.tsx?t=1763263524845:59:7) (at http://localhost:8084/src/contexts/AuthProvider.tsx:134:16)
[ERROR] 404 Error: User attempted to access non-existent route: /protected-route (at http://localhost:8084/src/pages/NotFound.tsx:23:12)
[ERROR] 404 Error: User attempted to access non-existent route: /protected-route (at http://localhost:8084/src/pages/NotFound.tsx:23:12)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[ERROR] 404 Error: User attempted to access non-existent route: /logout (at http://localhost:8084/src/pages/NotFound.tsx:23:12)
[ERROR] 404 Error: User attempted to access non-existent route: /logout (at http://localhost:8084/src/pages/NotFound.tsx:23:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/2d25d3dd-5e30-476b-8cde-9c4325fcbf3b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014
- **Test Name:** Logs and Monitoring Security
- **Test Code:** [TC014_Logs_and_Monitoring_Security.py](./TC014_Logs_and_Monitoring_Security.py)
- **Test Error:** The login operation generating logs was successfully performed and the system responded with an error message, indicating logs were generated. However, the payment operation could not be tested because the cart is empty, blocking access to the checkout page. The product update operation was not performed. Due to this, the task to verify logs for sensitive information and diagnostic detail is incomplete. Please address the empty cart issue to enable full testing of payment logs. Task stopped.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ojxmfxbflbfinodkhixk.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Erro no login: AuthApiError: Invalid login credentials
    at handleError3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6495:9)
    at async _handleRequest3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6536:5)
    at async _request (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6520:16)
    at async SupabaseAuthClient.signInWithPassword (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:8252:15)
    at async signIn (http://localhost:8084/src/contexts/AuthProvider.tsx:130:31)
    at async handleSubmit (http://localhost:8084/src/pages/Auth.tsx?t=1763263524845:59:7) (at http://localhost:8084/src/contexts/AuthProvider.tsx:134:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/9e4907bd-4382-41ec-a0c8-237e7475b689
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015
- **Test Name:** Test Coverage Verification for Core Functionalities
- **Test Code:** [TC015_Test_Coverage_Verification_for_Core_Functionalities.py](./TC015_Test_Coverage_Verification_for_Core_Functionalities.py)
- **Test Error:** The testing of critical flows was partially successful. Authentication was attempted but failed due to invalid credentials. Catalog and cart flows were verified by adding a product to the cart and viewing it. Checkout flow was tested by filling the form, but submission was blocked due to validation errors on CPF and CEP fields, and the need to review Terms of Service before finalizing the order. Payment flow could not be fully verified due to checkout form issues. Admin panel and realtime synchronization flows were not accessible or verified due to lack of credentials and UI access. Overall, critical functionality is partially covered by tests, but some areas require fixing or additional access for full verification.
Browser Console Logs:
[ERROR] 404 Error: User attempted to access non-existent route: /tests (at http://localhost:8084/src/pages/NotFound.tsx:23:12)
[ERROR] 404 Error: User attempted to access non-existent route: /tests (at http://localhost:8084/src/pages/NotFound.tsx:23:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://ojxmfxbflbfinodkhixk.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Erro no login: AuthApiError: Invalid login credentials
    at handleError3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6495:9)
    at async _handleRequest3 (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6536:5)
    at async _request (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:6520:16)
    at async SupabaseAuthClient.signInWithPassword (http://localhost:8084/node_modules/.vite/deps/@supabase_supabase-js.js?v=98395c94:8252:15)
    at async signIn (http://localhost:8084/src/contexts/AuthProvider.tsx:130:31)
    at async handleSubmit (http://localhost:8084/src/pages/Auth.tsx?t=1763263524845:59:7) (at http://localhost:8084/src/contexts/AuthProvider.tsx:134:16)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/12c33a26-1974-4616-9ff6-b7c8e8186aea
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016
- **Test Name:** Error Handling on Failed Payment or Webhook
- **Test Code:** [TC016_Error_Handling_on_Failed_Payment_or_Webhook.py](./TC016_Error_Handling_on_Failed_Payment_or_Webhook.py)
- **Test Error:** Stopped testing due to the 'Estado' dropdown selection issue on the checkout page. The dropdown does not allow selecting the correct state 'SP', which blocks form submission and prevents simulating payment failure. Please fix this issue to continue testing.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/9e20ec5f-8b47-4ec2-9726-622f41e6358c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017
- **Test Name:** Checkout Input Validation and Error Messages
- **Test Code:** [TC017_Checkout_Input_Validation_and_Error_Messages.py](./TC017_Checkout_Input_Validation_and_Error_Messages.py)
- **Test Error:** Stopped testing due to persistent validation error on 'Tipo de Pessoa' field despite valid selection. Reported the issue for developer fix. Validation of other checkout fields could not be completed.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.ca329abf-d633-4ceb-beab-74430f7b2289:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://ojxmfxbflbfinodkhixk.supabase.co/rest/v1/home_products?select=id%2Cimage_url&id=eq.e2f041dd-595f-4cb7-9325-2c6e981df4bd:0:0)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
[WARNING] DialogContent sem DialogTitle: adicione <DialogHeader><DialogTitle/></DialogHeader> para acessibilidade. (at http://localhost:8084/src/components/ui/dialog.tsx:85:146)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/2c17b549-f0bb-4ae3-9704-092a09d127e2/f74c6219-c5ff-4d2a-95e5-aa4211ee8350
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **23.53** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---