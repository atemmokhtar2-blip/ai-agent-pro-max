---
name: ProtectedRoute insertBefore crash
description: React 18 insertBefore DOM crash caused by mixed Wouter Switch route patterns — root cause and permanent fix.
---

# ProtectedRoute / Wouter insertBefore Crash

**Why:** React 18 concurrent rendering uses `insertBefore` to commit DOM changes during route transitions. When Wouter's `<Switch>` contains routes that mix the `component` prop pattern (`<Route path="/x" component={X} />`) with the `children` prop pattern (`<Route path="/x"><X /></Route>`), Wouter's reconciler produces a structurally inconsistent React element tree across renders. React 18 loses track of DOM node positions and throws: _"Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node."_

**Secondary trigger:** Returning `null` from ProtectedRoute (instead of a stable DOM node) also causes this crash. ProtectedRoute must always return a spinner element — never `null`.

**How to apply:**
- ALL routes inside `<Switch>` MUST use the `component` prop. No exceptions.
- Wrap protected routes in stable top-level page components defined outside the Router function (so they're not recreated on every render):
  ```tsx
  const ChatPage = () => <ProtectedRoute><AppLayout><ChatWorkspace /></AppLayout></ProtectedRoute>;
  // ...
  <Route path="/chat" component={ChatPage} />
  ```
- Move `<Toaster />` inside the `<WouterRouter>` wrapper (same render subtree as the Switch) to prevent portal timing conflicts during navigation.
- ProtectedRoute must always return a spinner node (never `null`) in unauthenticated/loading states.
