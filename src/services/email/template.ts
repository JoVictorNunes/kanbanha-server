const template = (owner: string, project: string) => `
<div style="display: flex; flex-direction: column; gap: 6px; align-items: center">
  <div>${owner} invited you to engage in the ${project} project.</div>
  <a
    href="http://localhost:5173"
    target="_blank"
    style="border: none; text-decoration: none; color: white; background-color: #2563EB; border-radius: 6px; padding: 8px 16px"
  >Engage in!</a>
</div>
`;

export default template;
