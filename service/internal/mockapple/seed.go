package mockapple

import (
	"encoding/base64"
	"fmt"
	"math"
	"strconv"
	"time"
)

// Synthetic sample data. Names, IDs and people are invented.

func (s *Server) at(daysAgo int, hour int) string {
	return s.now.Truncate(24*time.Hour).AddDate(0, 0, -daysAgo).Add(time.Duration(hour) * time.Hour).Format(time.RFC3339)
}

func (s *Server) seed() {
	for _, c := range []string{"BOOKS", "BUSINESS", "DEVELOPER_TOOLS", "EDUCATION", "ENTERTAINMENT", "FINANCE", "FOOD_AND_DRINK", "GAMES", "GRAPHICS_AND_DESIGN", "HEALTH_AND_FITNESS", "LIFESTYLE", "MEDICAL", "MUSIC", "NEWS", "PHOTO_AND_VIDEO", "PRODUCTIVITY", "REFERENCE", "SOCIAL_NETWORKING", "SPORTS", "TRAVEL", "UTILITIES", "WEATHER"} {
		s.put(&resource{Type: "appCategories", ID: c, Attrs: map[string]any{"platforms": []string{"IOS", "MAC_OS"}}})
	}
	ember := s.put(&resource{Type: "apps", ID: "6447102938", Attrs: map[string]any{"name": "Ember Planner", "bundleId": "com.example.ember", "sku": "EMBER001", "primaryLocale": "en-US"}})
	flint := s.put(&resource{Type: "apps", ID: "6451873320", Attrs: map[string]any{"name": "Flint Notes", "bundleId": "com.example.flint", "sku": "FLINT001", "primaryLocale": "en-US"}})
	for _, name := range []string{"appStoreVersions", "appInfos", "reviewSubmissions", "inAppPurchasesV2", "subscriptionGroups", "betaFeedbackScreenshotSubmissions", "betaFeedbackCrashSubmissions"} {
		s.many(ember, name)
		s.many(flint, name)
	}

	// App information: the live record and the one being edited.
	for i, state := range []string{"READY_FOR_DISTRIBUTION", "REJECTED"} {
		info := s.put(&resource{Type: "appInfos", ID: fmt.Sprintf("ember-info-%d", i), Attrs: map[string]any{"state": state, "appStoreAgeRating": "FOUR_PLUS"}})
		s.one(info, "primaryCategory", s.get("appCategories", "PRODUCTIVITY"))
		s.one(info, "secondaryCategory", s.get("appCategories", "LIFESTYLE"))
		s.one(info, "app", ember)
		s.link(ember, "appInfos", info)
		s.many(info, "appInfoLocalizations")
		subtitle := map[string]string{"en-US": "Focused, simple daily planning", "zh-Hans": "专注、简单的每日计划", "ja": "集中できるシンプルな毎日の計画", "zh-Hant": "專注、簡單的每日計畫"}
		if state == "REJECTED" {
			subtitle["en-US"] = "The best task manager ever"
		}
		for _, l := range [][2]string{{"en-US", "Ember Planner"}, {"zh-Hans", "Ember 计划"}, {"ja", "Ember プランナー"}, {"zh-Hant", "Ember 計畫"}} {
			loc := s.put(&resource{Type: "appInfoLocalizations", ID: fmt.Sprintf("ember-info-%d-%s", i, l[0]), Attrs: map[string]any{
				"locale": l[0], "name": l[1], "subtitle": subtitle[l[0]], "privacyPolicyUrl": "https://example.com/ember/privacy", "privacyChoicesUrl": "",
			}})
			s.link(info, "appInfoLocalizations", loc)
		}
	}
	flintInfo := s.put(&resource{Type: "appInfos", ID: "flint-info", Attrs: map[string]any{"state": "READY_FOR_DISTRIBUTION", "appStoreAgeRating": "FOUR_PLUS"}})
	s.one(flintInfo, "primaryCategory", s.get("appCategories", "PRODUCTIVITY"))
	s.link(flint, "appInfos", flintInfo)
	s.link(flintInfo, "appInfoLocalizations", s.put(&resource{Type: "appInfoLocalizations", ID: "flint-info-en", Attrs: map[string]any{"locale": "en-US", "name": "Flint Notes", "subtitle": "Quick notes that stay put"}}))

	// Beta groups and testers.
	groups := []*resource{
		s.put(&resource{Type: "betaGroups", ID: "grp-internal", Attrs: map[string]any{"name": "Acme Team", "isInternalGroup": true, "publicLinkEnabled": false}}),
		s.put(&resource{Type: "betaGroups", ID: "grp-public", Attrs: map[string]any{"name": "Public Beta", "isInternalGroup": false, "publicLinkEnabled": true, "publicLink": "https://testflight.apple.com/join/eMbEr123"}}),
		s.put(&resource{Type: "betaGroups", ID: "grp-partners", Attrs: map[string]any{"name": "Design Partners", "isInternalGroup": false, "publicLinkEnabled": false}}),
	}
	for i, g := range groups {
		s.one(g, "app", ember)
		g.Rels["betaTesters"] = &rel{many: true, total: []int{12, 1320, 40}[i]}
	}
	for i := 0; i < 1372; i++ {
		t := s.put(&resource{Type: "betaTesters", ID: fmt.Sprintf("tester-%d", i), Attrs: map[string]any{"email": fmt.Sprintf("tester%d@example.com", i)}})
		s.link(t, "apps", ember)
	}

	// Builds, newest first.
	type buildSeed struct {
		number, version, platform string
		daysAgo                   int
		processing                string
		expired                   bool
		internal, external        string
		groups                    []int
		notes                     string
	}
	builds := []buildSeed{
		{"192", "3.3.0", "IOS", 2, "PROCESSING", false, "PROCESSING", "PROCESSING", nil, ""},
		{"191", "3.3.0", "IOS", 3, "VALID", false, "IN_BETA_TESTING", "WAITING_FOR_BETA_REVIEW", []int{0, 2}, "Try the new weekly review and tell us if anything feels slow."},
		{"186", "3.2.0", "IOS", 12, "VALID", false, "IN_BETA_TESTING", "IN_BETA_TESTING", []int{0, 1, 2}, "Fixes the sign-in network error and updates the iPad screenshots flow. Please sign in with your own account and try exporting a task list to PDF."},
		{"185", "3.2.0", "IOS", 16, "VALID", true, "EXPIRED", "EXPIRED", []int{0}, ""},
		{"184", "3.2.0", "IOS", 17, "VALID", false, "IN_BETA_TESTING", "BETA_REJECTED", []int{0}, "First 3.2.0 candidate."},
		{"176", "3.1.4", "IOS", 45, "VALID", false, "IN_BETA_TESTING", "READY_FOR_BETA_SUBMISSION", []int{0}, ""},
		{"171", "3.1.3", "IOS", 59, "VALID", true, "EXPIRED", "EXPIRED", nil, ""},
		{"88", "3.2.0", "MAC_OS", 12, "VALID", false, "IN_BETA_TESTING", "READY_FOR_BETA_SUBMISSION", []int{0}, "Mac build of 3.2.0."},
	}
	byNumber := map[string]*resource{}
	for _, b := range builds {
		pre := s.get("preReleaseVersions", b.platform+b.version)
		if pre == nil {
			pre = s.put(&resource{Type: "preReleaseVersions", ID: b.platform + b.version, Attrs: map[string]any{"version": b.version, "platform": b.platform}})
		}
		uploaded := s.at(b.daysAgo, 14)
		res := s.put(&resource{Type: "builds", ID: "build-" + b.number, Attrs: map[string]any{
			"version": b.number, "uploadedDate": uploaded, "expirationDate": s.at(b.daysAgo-90, 14), "expired": b.expired,
			"minOsVersion": map[string]string{"IOS": "17.0", "MAC_OS": "14.0"}[b.platform], "processingState": b.processing,
			"usesNonExemptEncryption": false,
		}})
		detail := s.put(&resource{Type: "buildBetaDetails", ID: res.ID, Attrs: map[string]any{"internalBuildState": b.internal, "externalBuildState": b.external}})
		s.one(res, "preReleaseVersion", pre)
		s.one(res, "buildBetaDetail", detail)
		s.one(res, "app", ember)
		s.many(res, "betaGroups")
		s.many(res, "betaBuildLocalizations")
		for _, g := range b.groups {
			s.link(res, "betaGroups", groups[g])
			s.link(groups[g], "builds", res)
		}
		if b.notes != "" {
			s.link(res, "betaBuildLocalizations", s.put(&resource{Type: "betaBuildLocalizations", ID: "bbl-" + b.number, Attrs: map[string]any{"locale": "en-US", "whatsNew": b.notes}}))
		}
		byNumber[b.number] = res
	}
	for i, f := range []struct{ comment, device, email string }{
		{"Export to PDF cuts off the last task on the page.", "iPhone16,2", "mia.chen@example.com"},
		{"The weekly review chart overlaps the tab bar in landscape.", "iPad14,5", "noah.park@example.com"},
	} {
		fb := s.put(&resource{Type: "betaFeedbackScreenshotSubmissions", ID: fmt.Sprintf("fb-%d", i), Attrs: map[string]any{"comment": f.comment, "deviceModel": f.device, "osVersion": "18.5", "email": f.email, "createdDate": s.at(10-i*2, 9+i)}})
		s.one(fb, "build", byNumber["186"])
		s.link(ember, "betaFeedbackScreenshotSubmissions", fb)
	}
	crash := s.put(&resource{Type: "betaFeedbackCrashSubmissions", ID: "crash-0", Attrs: map[string]any{"comment": "App closed when I rotated during the focus timer.", "deviceModel": "iPhone15,3", "osVersion": "18.4", "email": "lena.ito@example.com", "createdDate": s.at(9, 18)}})
	s.one(crash, "build", byNumber["186"])
	s.link(ember, "betaFeedbackCrashSubmissions", crash)

	// App Store versions.
	type versionSeed struct {
		id, version, platform, state, release, build string
		daysAgo                                      int
	}
	versions := []versionSeed{
		{"ver-330", "3.3.0", "IOS", "REJECTED", "MANUAL", "191", 4},
		{"ver-320", "3.2.0", "IOS", "READY_FOR_DISTRIBUTION", "AFTER_APPROVAL", "186", 20},
		{"ver-314", "3.1.4", "IOS", "REPLACED_WITH_NEW_VERSION", "AFTER_APPROVAL", "176", 50},
		{"ver-313", "3.1.3", "IOS", "REPLACED_WITH_NEW_VERSION", "AFTER_APPROVAL", "171", 64},
		{"ver-mac-320", "3.2.0", "MAC_OS", "READY_FOR_DISTRIBUTION", "AFTER_APPROVAL", "88", 19},
	}
	versionByID := map[string]*resource{}
	copyText := map[string]map[string]string{
		"en-US":   {"description": "Ember helps you plan what matters, stay focused, and track every goal with ease. Simple, fast, and thoughtfully designed for Apple platforms.", "keywords": "planner,focus,to-do,productivity,schedule,checklist", "promotionalText": "Make every day clearer with smart lists and a focus timer that help you get important things done.", "whatsNew": "• Added weekly reviews\n• Improved the focus timer\n• Fixed known issues and improved stability"},
		"zh-Hans": {"description": "Ember 帮你规划重要的事、保持专注，并轻松追踪每个目标。简单、快速，为 Apple 平台精心设计。", "keywords": "计划,专注,待办,效率,日程", "promotionalText": "智能列表和专注计时器，让每一天更清晰。", "whatsNew": "• 新增每周回顾\n• 改进专注计时器"},
		"ja":      {"description": "Ember は大切なことを計画し、集中を保ち、すべての目標を簡単に追跡できるアプリです。", "keywords": "", "promotionalText": "", "whatsNew": ""},
		"zh-Hant": {"description": "Ember 幫你規劃重要的事、保持專注，並輕鬆追蹤每個目標。", "keywords": "計畫,專注,待辦,效率", "promotionalText": "", "whatsNew": "• 新增每週回顧"},
	}
	for _, v := range versions {
		res := s.put(&resource{Type: "appStoreVersions", ID: v.id, Attrs: map[string]any{
			"versionString": v.version, "platform": v.platform, "appVersionState": v.state, "appStoreState": v.state,
			"releaseType": v.release, "copyright": "2026 Acme Studio", "createdDate": s.at(v.daysAgo, 10),
		}})
		s.one(res, "app", ember)
		s.one(res, "build", byNumber[v.build])
		s.link(ember, "appStoreVersions", res)
		s.many(res, "appStoreVersionLocalizations")
		versionByID[v.id] = res
		locales := []string{"en-US", "zh-Hans", "ja", "zh-Hant"}
		if v.platform == "MAC_OS" {
			locales = []string{"en-US"}
		}
		for _, l := range locales {
			attrs := map[string]any{"locale": l, "supportUrl": "https://example.com/ember/support", "marketingUrl": "https://example.com/ember"}
			for key, value := range copyText[l] {
				attrs[key] = value
			}
			loc := s.put(&resource{Type: "appStoreVersionLocalizations", ID: v.id + "-" + l, Attrs: attrs})
			s.link(res, "appStoreVersionLocalizations", loc)
			s.many(loc, "appScreenshotSets")
			if l == "en-US" || l == "zh-Hans" {
				set := s.put(&resource{Type: "appScreenshotSets", ID: loc.ID + "-67", Attrs: map[string]any{"screenshotDisplayType": "APP_IPHONE_67"}})
				s.link(loc, "appScreenshotSets", set)
				s.many(set, "appScreenshots")
				for i, title := range []string{"Own your day", "Focus on what matters", "See progress clearly"} {
					shot := s.put(&resource{Type: "appScreenshots", ID: fmt.Sprintf("%s-%d", set.ID, i), Attrs: map[string]any{
						"fileName":   fmt.Sprintf("iphone-67-%d.png", i+1),
						"imageAsset": map[string]any{"templateUrl": screenshotSVG(title, i), "width": 1290, "height": 2796},
					}})
					s.link(set, "appScreenshots", shot)
				}
			}
		}
	}
	detail := s.put(&resource{Type: "appStoreReviewDetails", ID: "review-330", Attrs: map[string]any{
		"contactFirstName": "Alex", "contactLastName": "Lin", "contactPhone": "+1 415 555 0134", "contactEmail": "review@example.com",
		"demoAccountRequired": true, "demoAccountName": "review@example.com", "demoAccountPassword": "Ember-Review-2026",
		"notes": "Sign in with the review account. Open Today to try weekly reviews and the focus timer.",
	}})
	s.one(versionByID["ver-330"], "appStoreReviewDetail", detail)

	flintVersion := s.put(&resource{Type: "appStoreVersions", ID: "flint-ver-12", Attrs: map[string]any{"versionString": "1.2.0", "platform": "IOS", "appVersionState": "READY_FOR_DISTRIBUTION", "releaseType": "AFTER_APPROVAL", "createdDate": s.at(80, 10)}})
	s.link(flint, "appStoreVersions", flintVersion)
	s.link(flintVersion, "appStoreVersionLocalizations", s.put(&resource{Type: "appStoreVersionLocalizations", ID: "flint-ver-12-en", Attrs: map[string]any{"locale": "en-US", "description": "Quick notes that stay put.", "keywords": "notes,quick,memo"}}))

	// Review submissions.
	actor := s.put(&resource{Type: "actors", ID: "actor-alex", Attrs: map[string]any{"actorType": "USER", "userFirstName": "Alex", "userLastName": "Lin"}})
	for i, sub := range []struct {
		version, state, item string
		daysAgo              int
	}{
		{"ver-330", "UNRESOLVED_ISSUES", "REJECTED", 4},
		{"ver-320", "COMPLETE", "APPROVED", 18},
		{"ver-320", "COMPLETE", "REJECTED", 21},
		{"ver-314", "COMPLETE", "APPROVED", 49},
		{"ver-313", "COMPLETE", "REMOVED", 63},
	} {
		res := s.put(&resource{Type: "reviewSubmissions", ID: fmt.Sprintf("sub-%d", i), Attrs: map[string]any{"platform": "IOS", "state": sub.state, "submittedDate": s.at(sub.daysAgo, 16)}})
		s.one(res, "app", ember)
		s.one(res, "appStoreVersionForReview", versionByID[sub.version])
		s.one(res, "submittedByActor", actor)
		item := s.put(&resource{Type: "reviewSubmissionItems", ID: fmt.Sprintf("sub-%d-item", i), Attrs: map[string]any{"state": sub.item}})
		s.one(item, "appStoreVersion", versionByID[sub.version])
		s.link(res, "items", item)
		s.link(ember, "reviewSubmissions", res)
	}

	// Territories and in-app purchases.
	type territory struct {
		id, currency string
		rate         float64
		whole        bool
	}
	territories := []territory{{"USA", "USD", 1, false}, {"CHN", "CNY", 6.2, true}, {"JPN", "JPY", 160, true}, {"TWN", "TWD", 33, true}, {"HKG", "HKD", 7.8, true}, {"GBR", "GBP", 1, false}, {"DEU", "EUR", 1.2, false}, {"FRA", "EUR", 1.2, false}, {"CAN", "CAD", 1.4, false}, {"AUS", "AUD", 1.6, false}}
	for _, t := range territories {
		s.put(&resource{Type: "territories", ID: t.id, Attrs: map[string]any{"currency": t.currency}})
	}
	pricePoint := func(kind, id string, usd float64, t territory) *resource {
		price := usd * t.rate
		if t.whole {
			price = math.Round(price)
		} else {
			price = math.Floor(price) + 0.99
		}
		proceeds := price * 0.85 / 1.1
		if t.id == "USA" {
			proceeds = price * 0.85
		}
		format := func(v float64) string {
			if t.whole {
				return strconv.FormatFloat(math.Round(v), 'f', 0, 64)
			}
			return strconv.FormatFloat(v, 'f', 2, 64)
		}
		return s.put(&resource{Type: kind, ID: id, Attrs: map[string]any{"customerPrice": format(price), "proceeds": format(proceeds)}})
	}
	subs := []struct {
		id, group, name, product, period, state string
		level                                   int
		usd                                     float64
	}{
		{"6502918840", "Ember Pro", "Ember Pro Yearly", "com.example.ember.pro.yearly", "ONE_YEAR", "APPROVED", 1, 39.99},
		{"6502918842", "Ember Pro", "Ember Pro Monthly", "com.example.ember.pro.monthly", "ONE_MONTH", "APPROVED", 2, 4.99},
		{"6502918844", "Ember Pro", "Ember Pro Weekly", "com.example.ember.pro.weekly", "ONE_WEEK", "WAITING_FOR_REVIEW", 3, 1.99},
		{"6502918846", "Ember Team", "Ember Team Yearly", "com.example.ember.team.yearly", "ONE_YEAR", "APPROVED", 1, 99.99},
		{"6502918848", "Ember Team", "Ember Team Monthly", "com.example.ember.team.monthly", "ONE_MONTH", "APPROVED", 2, 9.99},
	}
	groupsByName := map[string]*resource{}
	for _, sub := range subs {
		g := groupsByName[sub.group]
		if g == nil {
			g = s.put(&resource{Type: "subscriptionGroups", ID: "group-" + sub.id, Attrs: map[string]any{"referenceName": sub.group}})
			s.many(g, "subscriptions")
			s.link(ember, "subscriptionGroups", g)
			groupsByName[sub.group] = g
		}
		res := s.put(&resource{Type: "subscriptions", ID: sub.id, Attrs: map[string]any{
			"name": sub.name, "productId": sub.product, "subscriptionPeriod": sub.period, "state": sub.state, "groupLevel": sub.level,
			"familySharable": sub.group == "Ember Pro", "reviewNote": "Open Settings → Ember Pro to see the paywall. Use a sandbox account to purchase.",
		}})
		s.one(res, "group", g)
		s.link(g, "subscriptions", res)
		s.many(res, "subscriptionLocalizations")
		s.many(res, "prices")
		for _, l := range [][3]string{{"en-US", sub.name, "Unlock every Pro feature"}, {"zh-Hans", sub.name, "解锁全部 Pro 功能"}, {"ja", sub.name, "すべての Pro 機能を利用"}, {"zh-Hant", sub.name, "解鎖全部 Pro 功能"}} {
			s.link(res, "subscriptionLocalizations", s.put(&resource{Type: "subscriptionLocalizations", ID: sub.id + "-" + l[0], Attrs: map[string]any{"locale": l[0], "name": l[1], "description": l[2], "state": "APPROVED"}}))
		}
		for _, t := range territories {
			p := s.put(&resource{Type: "subscriptionPrices", ID: sub.id + "-" + t.id, Attrs: map[string]any{"startDate": nil, "preserved": false}})
			s.one(p, "subscriptionPricePoint", pricePoint("subscriptionPricePoints", "spp-"+sub.id+"-"+t.id, sub.usd, t))
			s.one(p, "territory", s.get("territories", t.id))
			s.link(res, "prices", p)
		}
		if sub.id == "6502918842" {
			p := s.put(&resource{Type: "subscriptionPrices", ID: sub.id + "-USA-next", Attrs: map[string]any{"startDate": s.at(-21, 0)[:10], "preserved": true}})
			s.one(p, "subscriptionPricePoint", pricePoint("subscriptionPricePoints", "spp-next", 5.99, territories[0]))
			s.one(p, "territory", s.get("territories", "USA"))
			s.link(res, "prices", p)
		}
	}
	iaps := []struct {
		id, name, product, kind, state string
		usd                            float64
		locales                        int
	}{
		{"6502918850", "Ember Pro Lifetime", "com.example.ember.pro.lifetime", "NON_CONSUMABLE", "APPROVED", 79.99, 4},
		{"6502918852", "Focus Sound Pack", "com.example.ember.sounds", "NON_CONSUMABLE", "DEVELOPER_ACTION_NEEDED", 2.99, 2},
		{"6502918854", "50 AI Planning Credits", "com.example.ember.credits50", "CONSUMABLE", "MISSING_METADATA", 0.99, 1},
		{"6502918856", "Holiday Theme Pack", "com.example.ember.holiday", "NON_CONSUMABLE", "REMOVED_FROM_SALE", 1.99, 2},
	}
	for _, p := range iaps {
		res := s.put(&resource{Type: "inAppPurchases", ID: p.id, Attrs: map[string]any{
			"name": p.name, "productId": p.product, "inAppPurchaseType": p.kind, "state": p.state,
			"familySharable": p.kind != "CONSUMABLE" && p.id == "6502918850", "reviewNote": "",
		}})
		s.link(ember, "inAppPurchasesV2", res)
		s.many(res, "inAppPurchaseLocalizations")
		for _, l := range [][2]string{{"en-US", "Yours to keep, forever"}, {"zh-Hans", "一次购买，永久使用"}, {"ja", "一度の購入でずっと使える"}, {"zh-Hant", "一次購買，永久使用"}}[:p.locales] {
			s.link(res, "inAppPurchaseLocalizations", s.put(&resource{Type: "inAppPurchaseLocalizations", ID: p.id + "-" + l[0], Attrs: map[string]any{"locale": l[0], "name": p.name, "description": l[1], "state": "APPROVED"}}))
		}
		schedule := s.put(&resource{Type: "inAppPurchasePriceSchedules", ID: p.id})
		s.many(schedule, "manualPrices")
		s.many(schedule, "automaticPrices")
		for _, t := range territories {
			rel := "automaticPrices"
			if t.id == "USA" {
				rel = "manualPrices"
			}
			price := s.put(&resource{Type: "inAppPurchasePrices", ID: p.id + "-" + t.id, Attrs: map[string]any{"startDate": nil, "manual": rel == "manualPrices"}})
			s.one(price, "inAppPurchasePricePoint", pricePoint("inAppPurchasePricePoints", "ipp-"+p.id+"-"+t.id, p.usd, t))
			s.one(price, "territory", s.get("territories", t.id))
			s.link(schedule, rel, price)
		}
	}

	// Team.
	for i, u := range []struct {
		first, last, user string
		roles             []string
		all               bool
	}{
		{"Alex", "Lin", "alex@example.com", []string{"ACCOUNT_HOLDER", "ADMIN"}, true},
		{"Mia", "Chen", "mia@example.com", []string{"ADMIN"}, true},
		{"Noah", "Park", "noah@example.com", []string{"APP_MANAGER", "DEVELOPER"}, true},
		{"Lena", "Ito", "lena@example.com", []string{"DEVELOPER"}, false},
		{"Sam", "Rivera", "sam@example.com", []string{"MARKETING", "SALES"}, true},
		{"Priya", "Shah", "priya@example.com", []string{"FINANCE", "ACCESS_TO_REPORTS"}, true},
	} {
		s.put(&resource{Type: "users", ID: fmt.Sprintf("user-%d", i), Attrs: map[string]any{"firstName": u.first, "lastName": u.last, "username": u.user, "roles": u.roles, "allAppsVisible": u.all, "provisioningAllowed": true}})
	}
	s.put(&resource{Type: "userInvitations", ID: "invite-0", Attrs: map[string]any{"firstName": "Kai", "lastName": "Müller", "email": "kai@example.com", "roles": []string{"CUSTOMER_SUPPORT"}, "allAppsVisible": true, "expirationDate": s.at(-12, 0)}})
}

func screenshotSVG(title string, index int) string {
	colors := [][2]string{{"#fff1e8", "#f6b38e"}, {"#fff5eb", "#f8c374"}, {"#f8e9df", "#dda789"}}[index%3]
	svg := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="258" height="559" viewBox="0 0 258 559">`+
		`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient></defs>`+
		`<rect width="258" height="559" rx="28" fill="url(#g)"/><rect x="99" y="22" width="60" height="10" rx="5" fill="#44271e" opacity=".8"/>`+
		`<text x="129" y="96" font-family="-apple-system,Helvetica,sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#622f1f">%s</text>`+
		`<rect x="39" y="150" width="180" height="26" rx="8" fill="#fff" opacity=".6"/><rect x="39" y="190" width="180" height="26" rx="8" fill="#fff" opacity=".6"/>`+
		`<rect x="39" y="230" width="120" height="26" rx="8" fill="#fff" opacity=".6"/></svg>`, colors[0], colors[1], title)
	return "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte(svg))
}
