import { Link } from '@tanstack/react-router';

function NotFound() {
  return (
    <section>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </section>
  );
}

export default NotFound;
