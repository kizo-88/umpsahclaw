package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type NewsItem struct {
	Title string `json:"title"`
	Link  string `json:"link"`
}

type Report struct {
	Timestamp string     `json:"timestamp"`
	News      []NewsItem `json:"news"`
}

func main() {
	url := "https://www.umpsaholdings.my/blog"
	fmt.Printf("Fetching news from %s...\n", url)

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Fatalf("Error creating request: %v", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Error fetching URL: %v", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error reading response body: %v", err)
	}

	htmlContent := string(body)

	// A simple way to grab potential news titles from <h2> tags or specific classes
	// Based on the observed structure from the markdown read, titles are prominent.
	// In the raw HTML, Wix blogs often use <h2> for titles.
	re := regexp.MustCompile(`<h2[^>]*>(.*?)</h2>`)
	matches := re.FindAllStringSubmatch(htmlContent, -1)

	var news []NewsItem
	uniqueTitles := make(map[string]bool)

	for _, match := range matches {
		title := strings.TrimSpace(match[1])
		// Clean up HTML tags if any left inside
		title = regexp.MustCompile("<[^>]*>").ReplaceAllString(title, "")

		if title != "" && !uniqueTitles[title] {
			news = append(news, NewsItem{
				Title: title,
				Link:  url, // Link discovery would require more complex parsing
			})
			uniqueTitles[title] = true
		}
	}

	report := Report{
		Timestamp: time.Now().Format(time.RFC3339),
		News:      news,
	}

	jsonData, _ := json.MarshalIndent(report, "", "  ")
	err = ioutil.WriteFile("umpsa_news_report.json", jsonData, 0644)
	if err != nil {
		log.Fatalf("Error writing JSON report: %v", err)
	}

	// Generate Markdown version
	var md strings.Builder
	md.WriteString("# UMPSA Holdings News Report\n\n")
	md.WriteString(fmt.Sprintf("Generated at: %s\n\n", report.Timestamp))
	for _, item := range news {
		md.WriteString(fmt.Sprintf("- %s\n", item.Title))
	}

	err = ioutil.WriteFile("UMPS_NEWS.md", []byte(md.String()), 0644)
	if err != nil {
		log.Fatalf("Error writing Markdown report: %v", err)
	}

	fmt.Printf("Successfully scraped %d news items.\n", len(news))
	fmt.Println("Reports generated: umpsa_news_report.json, UMPS_NEWS.md")
}
