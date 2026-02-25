export async function GET() {
    const appUrl = process.env.NEXT_PUBLIC_URL;
  
    const config = {
      accountAssociation: {
          "header": "eyJmaWQiOjEwMjQ1MjMsInR5cGUiOiJhdXRoIiwia2V5IjoiMHg5RDY0NmViRjVFRTcyQzhkNzJFNGJlMzBGYTdGMTA2MDA0QjBFOTU0In0",
          "payload": "eyJkb21haW4iOiJmcm9udGVuZC1laWdodC1waS00OC52ZXJjZWwuYXBwIn0",
          "signature": "w+stZIQMiOwMfq4IhyGtdff4tAgCw42lOPvqmRUw2n11ILwTxJOS5rDZVa2KFW+SWmcVjiI7T5hfp8JpSbJAjhs="
        },
      frame: {
        version: "1",
        name: "LiquiFi",
        iconUrl: `${appUrl}/liquifi_icon.png`,
        homeUrl: appUrl,
        imageUrl: `${appUrl}/liquifi_splashscreen.png`,
        buttonTitle: "Launch LiquiFi",
        splashImageUrl: `${appUrl}/liquifi_splashscreen.png`,
        splashBackgroundColor: "#0E0E11",
      },
    };
  
    return Response.json(config);
  }