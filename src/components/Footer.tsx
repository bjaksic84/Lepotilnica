export default function Footer() {
    return (
        <footer className="bg-gray-50 border-t border-gray-100 py-12">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                <div>
                    <h3 className="font-playfair text-xl font-bold text-gray-900 mb-4">Lepotilnica by Karin</h3>
                    <p className="text-gray-600">
                        Dedicated to bringing out the best version of you with premium beauty treatments.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold text-gray-900 mb-4">Contact</h4>
                    <p className="text-gray-600">Mestni trg 1, Ljubljana</p>
                    <p className="text-gray-600">+386 1 234 5678</p>
                    <p className="text-gray-600">info@lepotilnica.si</p>
                </div>

                <div>
                    <h4 className="font-bold text-gray-900 mb-4">Social</h4>
                    <div className="flex justify-center md:justify-start space-x-4 text-gray-600">
                        <a href="#" className="hover:text-yellow-600">Instagram</a>
                        <a href="#" className="hover:text-yellow-600">Facebook</a>
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-200 mt-12 pt-8 text-center text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} Lepotilnica by Karin. All rights reserved.
            </div>
        </footer>
    );
}
