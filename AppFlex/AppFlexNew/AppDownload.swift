import Foundation
import UIKit

class AppDownload {
    var status: DownloadStatus = .initializing
    var progress: Float = 0.0
    var error: Error?
    var completionHandler: ((Bool, URL?, Error?) -> Void)?
    
    enum DownloadStatus {
        case initializing
        case downloading
        case processing
        case completed
        case failed
    }
    
    func downloadApp(fromURL url: URL, withFileName fileName: String, completion: @escaping (Bool, URL?, Error?) -> Void) {
        status = .downloading
        completionHandler = completion
        
        let tempDirectory = FileManager.default.temporaryDirectory
        let destinationURL = tempDirectory.appendingPathComponent(fileName)
        
        let downloadTask = URLSession.shared.downloadTask(with: url) { [weak self] (tempURL, response, error) in
            guard let self = self else { return }
            
            if let error = error {
                self.status = .failed
                self.error = error
                self.completionHandler?(false, nil, error)
                return
            }
            
            guard let tempURL = tempURL else {
                self.status = .failed
                let error = NSError(domain: "AppDownload", code: 1, userInfo: [NSLocalizedDescriptionKey: "临时文件URL为空"])
                self.error = error
                self.completionHandler?(false, nil, error)
                return
            }
            
            do {
                if FileManager.default.fileExists(atPath: destinationURL.path) {
                    try FileManager.default.removeItem(at: destinationURL)
                }
                
                try FileManager.default.moveItem(at: tempURL, to: destinationURL)
                
                self.status = .completed
                self.completionHandler?(true, destinationURL, nil)
            } catch {
                self.status = .failed
                self.error = error
                self.completionHandler?(false, nil, error)
            }
        }
        
        downloadTask.resume()
    }
} 
