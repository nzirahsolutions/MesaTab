import {FaInstagram, FaFacebook, FaYoutube} from 'react-icons/fa'

export default function Footer() {
  return (
    <footer>
      <p>© 2026 MesaTab. A product by Nzirah Solutions.</p>
      <div className="links">
        <a href="https://www.instagram.com/nzirahsolutions" target="_blank" rel="noopener noreferrer">
          <FaInstagram size={30} />
        </a>
        <a href="https://www.facebook.com/people/Nzirah-Solutions/61586633807676/" target="_blank" rel="noopener noreferrer">
          <FaFacebook size={30} />
        </a>
        <a href="" target="_blank" rel="noopener noreferrer">
          <FaYoutube size={30} />
        </a>
      </div>
    </footer>
  )
}
