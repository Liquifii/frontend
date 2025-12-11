import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTwitter, faFacebook, faTelegram, faGithub, faGooglePlay, faApple } from '@fortawesome/free-brands-svg-icons'

const Footer = () => {
    return (
        <footer className="bg-[#221F24] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
     
                <div className="">
                  
                    <div>
                        <p className="text-2xl font-semibold">Attestify</p>
                        <p className="text-[#AAAAAA] mt-3 max-w-sm">
                            Verified savings on Celo. Earn yield while preserving your privacy.
                        </p>

                    </div>

                   
                    <div className="flex flex-row justify-between">

                          <div className="flex items-center gap-4 mt-6">
                            <a aria-label="Twitter" href="#" className="hover:text-white/80 transition-colors">
                                <FontAwesomeIcon icon={faTwitter} className="w-6 h-6" />
                            </a>
                            <a aria-label="Facebook" href="#" className="hover:text-white/80 transition-colors">
                                <FontAwesomeIcon icon={faFacebook} className="w-6 h-6" />
                            </a>
                            <a aria-label="Telegram" href="#" className="hover:text-white/80 transition-colors">
                                <FontAwesomeIcon icon={faTelegram} className="w-6 h-6" />
                            </a>
                            <a aria-label="GitHub" href="#" className="hover:text-white/80 transition-colors">
                                <FontAwesomeIcon icon={faGithub} className="w-6 h-6" />
                            </a>
                        </div>
                     
                     <div>
                        <ul className="space-x-3 text-white/90 flex">
                            <li><a href="#" className="hover:text-white transition-colors">Dashboard</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">How it Works</a></li>
                        </ul>
                        </div>

                             <div className="flex items-center gap-4">
                            <a href="#" aria-label="Get it on Google Play" className="group inline-flex items-center gap-3 rounded-lg bg-white px-4 py-2 ring-1 ring-white/10 hover:ring-white/30 transition">
                                <FontAwesomeIcon icon={faGooglePlay} className="text-black w-5 h-5" />
                                <span className="leading-tight">
                                    <span className="block text-[10px] text-black/80">GET IT ON</span>
                                    <span className="block text-sm font-medium text-black">Google Play</span>
                                </span>
                            </a>
                            <a href="#" aria-label="Download on the App Store" className="group inline-flex items-center gap-3 rounded-lg bg-white px-4 py-2 ring-1 ring-white/10 hover:ring-white/30 transition">
                                <FontAwesomeIcon icon={faApple} className="text-black w-5 h-5" />
                                <span className="leading-tight">
                                    <span className="block text-[10px] text-black/80">DOWNLOAD ON THE</span>
                                    <span className="block text-sm font-medium text-black">App Store</span>
                                </span>
                            </a>
                        </div>
                    </div>

                
                
                </div>

               
                <div className="mt-10  border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[#AAAAAA] text-[14px] md:text-[16px]">
                        © 2024 Attestify. Built for Celo Proof of Ship
                    </p>

                    <div className="flex items-center gap-6 text-[#AAAAAA] text-[14px] md:text-[16px]">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <span className="h-4 w-px bg-white/10" />
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer