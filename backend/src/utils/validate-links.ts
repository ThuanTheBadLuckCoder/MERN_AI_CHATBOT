import { NextFunction, Request, Response } from "express";

export default async function handler( req: Request, res: Response, next: NextFunction ) {
    try {
        const { url } = req.body;
        console.log("url: ", url);

        const response = await fetch(url, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; URLChecker/1.0)',
            },
          });

          console.log("response: ", response);

          const exists = response.ok || (response.status >= 300 && response.status < 400);

          console.log("exists: ", exists);
        return res.status(200).json({ exists: exists });
    } catch (error) {
        console.error('Error checking URL:', error);
        return res.status(400).json({ exists: false });
    }
}