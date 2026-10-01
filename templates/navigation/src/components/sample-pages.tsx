export function HomePage() {
  return (
    <section className="main-page home-page">
      <p className="eyebrow">Your next idea starts here</p>
      <h1>The Starter Kit</h1>
      <p className="lead">Built for the web. Ready for the edge.</p>
    </section>
  );
}
export function LabsPage() {
  return (
    <section className="main-page">
      <div className="page-heading">
        <p className="eyebrow">Room to experiment</p>
        <h1>Labs</h1>
        <p className="lead">Small ideas. Working prototypes. Your next project.</p>
      </div>
      <div className="sample-grid">
        <article className="sample-card">
          <h2>Make something</h2>
          <p>A blank canvas for your first experiment.</p>
        </article>
        <article className="sample-card">
          <h2>Make it yours</h2>
          <p>One design system, wherever you take it.</p>
        </article>
      </div>
    </section>
  );
}
export function AboutPage() {
  return (
    <section className="main-page about-page">
      <p className="eyebrow">A starting point, made to grow</p>
      <h1>About</h1>
      <p className="lead">A quiet foundation for ambitious ideas. Bring your project to life.</p>
    </section>
  );
}
