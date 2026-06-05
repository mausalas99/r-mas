import{Ee as D,J as $,Kd as q,je as r,pe as h,qe as b}from"/js/chunks/chunk-BTNGRVQ2.js";import{b as L}from"/js/chunks/chunk-KVCGO4KM.js";import{a as d,b as g,c as I,e as x,f as A,g as O,h as _,i as B,j as C,k as T,l as u,n as E,p as H,q as w}from"/js/chunks/chunk-VYF2YG7V.js";function X(){return typeof window>"u"?null:window.rplusDb||window.electronAPI||null}function z(e,n="info"){typeof window<"u"&&typeof window.showToast=="function"&&window.showToast(e,n)}function Z(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function ee(e){return Z(e).replace(/"/g,"&quot;")}function ne(e){return`local_${String(e||"").replace(/[^a-z0-9]/gi,"").toLowerCase().slice(-10)||"device"}`.slice(0,32)}function M(e){e.innerHTML=`
      <h3 class="clinical-onboarding-title">\xBFC\xF3mo usar\xE1s R+?</h3>
      <p class="clinical-teams-lead">Elige antes de configurar tu perfil. La elecci\xF3n queda guardada en este equipo.</p>
      <div class="clinical-onboard-mode-grid" role="group" aria-label="Modo de uso">
        <button type="button" class="clinical-onboard-mode-card" data-sync-mode="lan">
          <span class="clinical-onboard-mode-card-title">Guardia en red (LAN)</span>
          <span class="clinical-onboard-mode-card-desc">Usuario @usuario, sala, sincronizaci\xF3n en vivo con el equipo y <strong>Mi rotaci\xF3n</strong>.</span>
        </button>
        <button type="button" class="clinical-onboard-mode-card clinical-onboard-mode-card--muted" data-sync-mode="local">
          <span class="clinical-onboard-mode-card-title">Solo este equipo</span>
          <span class="clinical-onboard-mode-card-desc">Sin LAN ni LiveSync: expedientes y notas solo en esta Mac. Sin rotaciones ni sala compartida.</span>
        </button>
      </div>`}function W(e,n){let a=String(n.clinicalRank||r.user?.rank||"R1"),t=String(n.clinicalDisplayName||r.user?.clinical_name||"");e.innerHTML=`
      <h3 class="clinical-onboarding-title">Perfil local</h3>
      <p class="clinical-teams-lead">R+ no usar\xE1 red de guardia. Solo necesitamos c\xF3mo firmar notas y documentos en esta Mac.</p>
      <form id="clinical-onboard-local-form" class="clinical-teams-create-form clinical-onboard-form clinical-onboard-form--local">
        <div class="field-group">
          <label for="onboard-local-name">Tu nombre en notas *</label>
          <input id="onboard-local-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
            value="${ee(t)}" required autocomplete="name">
        </div>
        <div class="field-group">
          <label for="onboard-local-rank">Rango (opcional)</label>
          <select id="onboard-local-rank" class="profile-input">
            <option value="R1" ${a==="R1"?"selected":""}>R1</option>
            <option value="R2" ${a==="R2"?"selected":""}>R2</option>
            <option value="R3" ${a==="R3"?"selected":""}>R3</option>
            <option value="R4" ${a==="R4"?"selected":""}>R4</option>
          </select>
        </div>
        <p id="onboard-error" class="clinical-registration-error" hidden></p>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Continuar sin LAN</button>
          <button type="button" id="clinical-onboard-back-mode" class="btn-med-secondary">Cambiar modo</button>
        </div>
      </form>`}async function P(){let{refreshMainClinicalOnboardingIfNeeded:e}=await import("/js/chunks/clinical-onboarding-main-P74W2RZB.js");await e()}async function ae(e){if(e==="local")C(!0);else if(e==="lan")C(!1);else return;await P()}async function ie(){let e=u();delete e.clinicalLocalOnly;try{localStorage.setItem("rpc-settings",JSON.stringify(e))}catch{}await P()}async function re(e){e.preventDefault();let n=String(document.getElementById("onboard-local-name")?.value||"").trim(),a=String(document.getElementById("onboard-local-rank")?.value||"R1"),t=document.getElementById("onboard-error");if(!n){t&&(t.textContent="Escribe c\xF3mo quieres aparecer en notas y documentos.",t.hidden=!1);return}let o=X(),i=String(r.user?.user_id||"");if(!i||!o){z("Sesi\xF3n cl\xEDnica no disponible.","error");return}let s=ne(i);if(d(r.user?.username||"")!==s&&typeof o.dbClinicalUsernameClaim=="function"){let l=await o.dbClinicalUsernameClaim({userId:i,username:s});if(!l?.ok&&!/ya está en uso/i.test(String(l?.error||""))){t&&(t.textContent=l?.error||"No se pudo guardar el perfil local.",t.hidden=!1);return}l?.ok&&r.user&&(r.user.username=s)}if(typeof o.dbClinicalProfileUpsert=="function"){let l=await o.dbClinicalProfileUpsert({userId:i,clinicalName:n,rank:a,sala:null,isProgramAdmin:!1});if(!l?.ok){t&&(t.textContent=l?.error||"No se guard\xF3 el perfil.",t.hidden=!1);return}r.user&&(r.user.rank=a,r.user.clinical_name=n,r.user.sala=null,r.user.is_program_admin=0)}w({userId:i,username:s,displayName:n,rank:a,sala:"",registered:!0,lanProfileGateComplete:!0,isProgramAdmin:!1}),C(!0),t&&(t.hidden=!0),await b(),document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed")),z("Listo. R+ queda solo en este equipo, sin sincronizaci\xF3n LAN.","success"),await P()}function G(){let e=document.querySelector(".clinical-onboard-mode-grid");e&&!e._rpcModeWired&&(e._rpcModeWired=!0,e.addEventListener("click",t=>{let o=t.target.closest("[data-sync-mode]");o&&ae(String(o.getAttribute("data-sync-mode")||""))}));let n=document.getElementById("clinical-onboard-local-form");n&&!n._rpcLocalWired&&(n._rpcLocalWired=!0,n.addEventListener("submit",t=>void re(t)));let a=document.getElementById("clinical-onboard-back-mode");a&&!a._rpcBackModeWired&&(a._rpcBackModeWired=!0,a.addEventListener("click",()=>void ie()))}function te(){return typeof window>"u"?null:window.rplusDb||window.electronAPI||null}function f(e,n="info"){typeof window<"u"&&typeof window.showToast=="function"&&window.showToast(e,n)}function y(){try{let e=JSON.parse(localStorage.getItem("rpc-settings")||"{}");return String(e.clientId||"")}catch{return""}}function k(){let e=r.user;if(!e?.user_id||I(e.username,y()))return!0;try{let a=JSON.parse(localStorage.getItem("rpc-settings")||"{}"),t=String(a.clinicalUsername||"").trim();if(t&&!g(d(t))||t&&I(e.username,y()))return!0}catch{}let n=d(e.username||"");return!g(n)}function _e(){if(!r.user?.user_id)return!0;let e=r.teams||[];return $(e,r.user).length===0}function N(){if(!L())return!1;let e=u();return!(e.clinicalRegistered===!0||B(e))}function j(){if(!L())return!1;if(!r.user?.user_id||N())return!0;let e=u();return _(e)?e.clinicalRegistered!==!0?!0:!String(r.user?.clinical_name||"").trim():!!(E(e)||T(r.user?.username)||k()||!String(r.user?.clinical_name||"").trim()||!String(r.user?.sala||"").trim())}function Ee(){return j()}function oe(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function F(e){return oe(e).replace(/"/g,"&quot;")}async function le(e){e.preventDefault();let n=d(String(document.getElementById("onboard-username")?.value||"")),a=String(document.getElementById("onboard-clinical-name")?.value||"").trim(),t=String(document.getElementById("onboard-rank")?.value||"R1"),o=String(document.getElementById("onboard-sala")?.value||"").trim(),i=document.getElementById("onboard-error");if(!g(n)){i&&(i.textContent="Usuario LAN inv\xE1lido. Usa 3\u201332 letras min\xFAsculas (a-z, 0-9, _), p. ej. drmendoza \u2014 no tu nombre en guardia.",i.hidden=!1);return}if(!a){i&&(i.textContent="Escribe tu nombre en guardia.",i.hidden=!1);return}let s=u(),c=String(r.user?.user_id||""),l=te();if(!c||!l){f("Sesi\xF3n cl\xEDnica no disponible.","error");return}let R=d(r.user?.username||"")!==n;if(R){let{assertLanRoomForUsernameRegister:m}=await import("/js/chunks/clinical-profile-lan-sync-42EYJCWI.js");await m({sala:o})}if(R&&typeof l.dbClinicalUsernameClaim=="function"){let m=await l.dbClinicalUsernameClaim({userId:c,username:n});if(m?.ok)r.user&&(r.user.username=n);else{let S=String(m?.error||"");if(/ya está en uso/i.test(S))if(d(String(s.clinicalUsername||""))===n||window.confirm(`El usuario @${n} ya est\xE1 registrado en esta base de datos.

\xBFRecuperar tu cuenta en este dispositivo?`)){let U=await h(n,s,y());if(!U.ok){i&&(i.textContent=U.error||S,i.hidden=!1);return}c=String(r.user?.user_id||""),s=u()}else{i&&(i.textContent=S,i.hidden=!1);return}else{i&&(i.textContent=S||"No se pudo registrar el usuario.",i.hidden=!1);return}}}if(typeof l.dbClinicalProfileUpsert=="function"){let m=await l.dbClinicalProfileUpsert({userId:c,clinicalName:a,rank:t,sala:o||null,isProgramAdmin:!1});if(!m?.ok){i&&(i.textContent=m?.error||"No se guard\xF3 el perfil.",i.hidden=!1);return}r.user&&(r.user.rank=t,r.user.clinical_name=a,r.user.sala=o||null,r.user.is_program_admin=0)}w({userId:c,username:n,displayName:a,rank:t,sala:o||"",registered:!0,lanProfileGateComplete:!0,isProgramAdmin:!1}),i&&(i.hidden=!0),await b(),document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));let{flushClinicalProfileToLan:J,LAN_PROFILE_PUSH_FAILED_MSG:V,isBenignLanPushSkipCode:Y,notifyLanProfilePushResult:K}=await import("/js/chunks/clinical-profile-lan-sync-42EYJCWI.js"),p=await J();K(p,f),!p.ok&&!Y(p.code)&&!(p.channels&&p.channels.outbox)?f(V,"warning"):p.ok&&R?f("Perfil guardado y @usuario publicado en la sala \u21C4.","success"):f("Perfil guardado. Abre Mi rotaci\xF3n cuando quieras buscar equipos o crear el tuyo.","success");let{refreshMainClinicalOnboardingIfNeeded:Q}=await import("/js/chunks/clinical-onboarding-main-P74W2RZB.js");await Q()}async function se(){let e=d(String(document.getElementById("onboard-username")?.value||"")),n=document.getElementById("onboard-error"),a=document.getElementById("clinical-onboard-resume-btn");if(!g(e)){n&&(n.textContent="Escribe tu usuario LAN para recuperarlo.",n.hidden=!1);return}a instanceof HTMLButtonElement&&(a.disabled=!0,a.textContent="Recuperando\u2026");let t=u();try{let o=await h(e,t,y());if(!o.ok){n&&(n.textContent=o.error||"No se pudo recuperar la cuenta.",n.hidden=!1);return}if(n&&(n.hidden=!0),f("Cuenta recuperada.","success"),await b(),!k()){let{refreshMainClinicalOnboardingIfNeeded:s}=await import("/js/chunks/clinical-onboarding-main-P74W2RZB.js");await s();return}f("Completa tu perfil y pulsa Continuar.","info");let{refreshMainClinicalOnboardingIfNeeded:i}=await import("/js/chunks/clinical-onboarding-main-P74W2RZB.js");await i()}finally{a instanceof HTMLButtonElement&&(a.disabled=!1,a.textContent="Recuperar mi usuario")}}async function v(){G();let e=document.getElementById("clinical-onboard-username-form");e&&!e._rpcOnboardWired&&(e._rpcOnboardWired=!0,e.addEventListener("submit",a=>void le(a)));let n=document.getElementById("clinical-onboard-resume-btn");n&&!n._rpcResumeWired&&(n._rpcResumeWired=!0,n.addEventListener("click",()=>void se()))}async function Me(){await q(async e=>{await ce(e)})}async function ce(e){if(!String(r.user?.user_id||"")){if(N()){M(e),await v();return}let{buildOnboardingSessionBlockHtml:i}=await import("/js/chunks/clinical-onboarding-main-P74W2RZB.js");e.innerHTML=await i();return}await D();let a=H(u()),t=E(a),o=t?"":d(String(a.clinicalUsername||""));if(!t&&k()&&o&&g(o))try{await h(o,a,y()),await b(),a=u()}catch{}if(!j()){let{hideMainClinicalOnboarding:i}=await import("/js/chunks/clinical-onboarding-main-P74W2RZB.js");if(i(),e.closest("#clinical-teams-panel-body")){let{renderClinicalTeamsPanel:s}=await import("/js/chunks/clinical-teams-KYRKEX5X.js");await s()}return}if(N()){M(e),await v();return}if(_(a)){W(e,a),await v();return}{let i=String(a.clinicalRank||r.user?.rank||"R1"),s=t?"":String(a.clinicalDisplayName||r.user?.clinical_name||""),c=String(a.clinicalSala||r.user?.sala||""),l=t?`<p class="clinical-teams-lead clinical-onboard-gate-lead">${x}</p>`:'<p class="clinical-teams-lead">Confirma tu usuario LAN, nombre en guardia, rango y sala. Para equipos, abre <strong>Mi rotaci\xF3n</strong> despu\xE9s.</p>';e.innerHTML=`
      <h3 class="clinical-onboarding-title">Configura tu rotaci\xF3n</h3>
      <h4 class="clinical-teams-section-title">Usuario y nombre en guardia</h4>
      ${l}
      <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form">
        <div class="field-group">
          <label for="onboard-username">Usuario LAN (@usuario) *</label>
          <input id="onboard-username" type="text" class="profile-input" placeholder="ej. drmendoza"
            value="${F(o)}" required autocomplete="off" spellcheck="false">
          <p class="clinical-teams-hint">${A}</p>
        </div>
        <div class="field-group">
          <label for="onboard-clinical-name">Nombre en guardia *</label>
          <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
            value="${F(s)}" required autocomplete="name">
          <p class="clinical-teams-hint">${O}</p>
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
            <option value="Sala 1" ${c==="Sala 1"?"selected":""}>Sala 1</option>
            <option value="Sala 2" ${c==="Sala 2"?"selected":""}>Sala 2</option>
            <option value="Sala E" ${c==="Sala E"?"selected":""}>Sala E</option>
          </select>
        </div>
        <p id="onboard-error" class="clinical-registration-error" hidden></p>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Guardar perfil</button>
          <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
        </div>
      </form>`,await v()}}export{M as a,G as b,k as c,_e as d,N as e,j as f,Ee as g,Me as h,ce as i};
//# sourceMappingURL=/js/chunks/chunk-W6DEUNXA.js.map
