import{H as l,Hd as x,I as f,J as v,M as _,Oc as U,md as t,sd as w,td as S}from"/js/chunks/chunk-RMI3C6IQ.js";import{b as E}from"/js/chunks/chunk-L4EWIBTY.js";import{b as u,d as C,f as P}from"/js/chunks/chunk-4R6RWLLM.js";function T(){return typeof window>"u"?null:window.rplusDb||window.electronAPI||null}function d(e,n="info"){typeof window<"u"&&typeof window.showToast=="function"&&window.showToast(e,n)}function b(){try{let e=JSON.parse(localStorage.getItem("rpc-settings")||"{}");return String(e.clientId||"")}catch{return""}}function R(){let e=t.user;if(!e?.user_id||v(e.username,b()))return!0;try{let r=JSON.parse(localStorage.getItem("rpc-settings")||"{}"),o=String(r.clinicalUsername||"").trim();if(o&&!f(l(o))||o&&v(e.username,b()))return!0}catch{}let n=l(e.username||"");return!f(n)}function Z(){if(!t.user?.user_id)return!0;let e=t.teams||[];return _(e,t.user).length===0}function k(){return E()?!!(!t.user?.user_id||C(u())||R()||!String(t.user?.clinical_name||"").trim()||!String(t.user?.sala||"").trim()):!1}function ee(){return k()}function $(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function L(e){return $(e).replace(/"/g,"&quot;")}async function q(e){e.preventDefault();let n=l(String(document.getElementById("onboard-username")?.value||"")),r=String(document.getElementById("onboard-clinical-name")?.value||"").trim(),o=String(document.getElementById("onboard-rank")?.value||"R1"),i=String(document.getElementById("onboard-sala")?.value||"").trim(),a=document.getElementById("onboard-error");if(!f(n)){a&&(a.textContent="Usuario inv\xE1lido (3\u201332 caracteres, min\xFAsculas).",a.hidden=!1);return}if(!r){a&&(a.textContent="Escribe tu nombre en guardia.",a.hidden=!1);return}let s=u(),p=String(t.user?.user_id||""),g=T();if(!p||!g){d("Sesi\xF3n cl\xEDnica no disponible.","error");return}let h=l(t.user?.username||"")!==n;if(h){let{assertLanRoomForUsernameRegister:c}=await import("/js/chunks/clinical-profile-lan-sync-NBZZLYNA.js");await c({sala:i})}if(h&&typeof g.dbClinicalUsernameClaim=="function"){let c=await g.dbClinicalUsernameClaim({userId:p,username:n});if(c?.ok)t.user&&(t.user.username=n);else{let y=String(c?.error||"");if(/ya está en uso/i.test(y))if(l(String(s.clinicalUsername||""))===n||window.confirm(`El usuario @${n} ya est\xE1 registrado en esta base de datos.

\xBFRecuperar tu cuenta en este dispositivo?`)){let I=await w(n,s,b());if(!I.ok){a&&(a.textContent=I.error||y,a.hidden=!1);return}p=String(t.user?.user_id||""),s=u()}else{a&&(a.textContent=y,a.hidden=!1);return}else{a&&(a.textContent=y||"No se pudo registrar el usuario.",a.hidden=!1);return}}}if(typeof g.dbClinicalProfileUpsert=="function"){let c=await g.dbClinicalProfileUpsert({userId:p,clinicalName:r,rank:o,sala:i||null,isProgramAdmin:!1});if(!c?.ok){a&&(a.textContent=c?.error||"No se guard\xF3 el perfil.",a.hidden=!1);return}t.user&&(t.user.rank=o,t.user.clinical_name=r,t.user.sala=i||null,t.user.is_program_admin=0)}P({userId:p,username:n,displayName:r,rank:o,sala:i||"",registered:!0,lanProfileGateComplete:!0,isProgramAdmin:!1}),a&&(a.hidden=!0),await S(),document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));let{flushClinicalProfileToLan:B,LAN_PROFILE_PUSH_FAILED_MSG:N,isBenignLanPushSkipCode:O,notifyLanProfilePushResult:M}=await import("/js/chunks/clinical-profile-lan-sync-NBZZLYNA.js"),m=await B();M(m,d),!m.ok&&!O(m.code)&&!(m.channels&&m.channels.outbox)?d(N,"warning"):m.ok&&h?d("Perfil guardado y @usuario publicado en la sala \u21C4.","success"):d("Perfil guardado. Abre Mi rotaci\xF3n cuando quieras buscar equipos o crear el tuyo.","success");let{refreshMainClinicalOnboardingIfNeeded:A}=await import("/js/chunks/clinical-onboarding-main-5AD5UXD4.js");await A()}async function H(){let e=l(String(document.getElementById("onboard-username")?.value||"")),n=document.getElementById("onboard-error"),r=document.getElementById("clinical-onboard-resume-btn");if(!f(e)){n&&(n.textContent="Escribe tu usuario LAN para recuperarlo.",n.hidden=!1);return}r instanceof HTMLButtonElement&&(r.disabled=!0,r.textContent="Recuperando\u2026");let o=u();try{let i=await w(e,o,b());if(!i.ok){n&&(n.textContent=i.error||"No se pudo recuperar la cuenta.",n.hidden=!1);return}if(n&&(n.hidden=!0),d("Cuenta recuperada.","success"),await S(),!R()){let{refreshMainClinicalOnboardingIfNeeded:s}=await import("/js/chunks/clinical-onboarding-main-5AD5UXD4.js");await s();return}d("Completa tu perfil y pulsa Continuar.","info");let{refreshMainClinicalOnboardingIfNeeded:a}=await import("/js/chunks/clinical-onboarding-main-5AD5UXD4.js");await a()}finally{r instanceof HTMLButtonElement&&(r.disabled=!1,r.textContent="Recuperar mi usuario")}}async function D(){let e=document.getElementById("clinical-onboard-username-form");e&&!e._rpcOnboardWired&&(e._rpcOnboardWired=!0,e.addEventListener("submit",r=>void q(r)));let n=document.getElementById("clinical-onboard-resume-btn");n&&!n._rpcResumeWired&&(n._rpcResumeWired=!0,n.addEventListener("click",()=>void H()))}async function ne(){await U(async e=>{await F(e)})}async function F(e){if(!String(t.user?.user_id||"")){e.innerHTML='<p class="clinical-teams-lead">Activa la sesi\xF3n cl\xEDnica para continuar.</p>';return}await x();let r=u(),o=l(String(r.clinicalUsername||""));if(!C(r)&&R()&&o&&f(o))try{await w(o,r,b()),await S(),r=u()}catch{}if(!k()){let{hideMainClinicalOnboarding:i}=await import("/js/chunks/clinical-onboarding-main-5AD5UXD4.js");if(i(),e.closest("#clinical-teams-panel-body")){let{renderClinicalTeamsPanel:a}=await import("/js/chunks/clinical-teams-H4E7ZEIX.js");await a()}return}{let i=String(r.clinicalRank||t.user?.rank||"R1"),a=String(r.clinicalDisplayName||t.user?.clinical_name||""),s=String(r.clinicalSala||t.user?.sala||"");e.innerHTML=`
      <h3 class="clinical-onboarding-title">Configura tu rotaci\xF3n</h3>
      <h4 class="clinical-teams-section-title">Rango y rotaci\xF3n</h4>
      <p class="clinical-teams-lead">Confirma tu <strong>usuario LAN</strong>, nombre en guardia, rango y sala para aparecer en el directorio y que el admin pueda asignarte a equipos. Es obligatorio tras actualizar a 5.5.7. Para equipos, abre <strong>Mi rotaci\xF3n</strong> despu\xE9s.</p>
      <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form">
        <div class="field-group">
          <label for="onboard-username">Usuario LAN *</label>
          <input id="onboard-username" type="text" class="profile-input" placeholder="mgarcia"
            value="${L(o||"")}" required>
        </div>
        <div class="field-group">
          <label for="onboard-clinical-name">Nombre en guardia *</label>
          <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="Dr. P\xE9rez"
            value="${L(a)}" required>
        </div>
        <div class="field-group">
          <label for="onboard-rank">Rango</label>
          <select id="onboard-rank" class="profile-input">
            <option value="R1" ${i==="R1"?"selected":""}>R1</option>
            <option value="R2" ${i==="R2"?"selected":""}>R2</option>
            <option value="R3" ${i==="R3"?"selected":""}>R3</option>
            <option value="R4" ${i==="R4"?"selected":""}>R4</option>
          </select>
        </div>
        <div class="field-group">
          <label for="onboard-sala">Sala *</label>
          <select id="onboard-sala" class="profile-input" required>
            <option value="">\u2014 Seleccionar \u2014</option>
            <option value="Sala 1" ${s==="Sala 1"?"selected":""}>Sala 1</option>
            <option value="Sala 2" ${s==="Sala 2"?"selected":""}>Sala 2</option>
            <option value="Sala E" ${s==="Sala E"?"selected":""}>Sala E</option>
          </select>
        </div>
        <p id="onboard-error" class="clinical-registration-error" hidden></p>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Guardar perfil</button>
          <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
        </div>
      </form>`,await D()}}export{R as a,Z as b,k as c,ee as d,ne as e,F as f};
//# sourceMappingURL=/js/chunks/chunk-2VHN25ZA.js.map
