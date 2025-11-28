#!/usr/bin/env python3

# Copyright (c) Facebook, Inc. and its affiliates.
# All rights reserved.
#
# This source code is licensed under the license found in the
# LICENSE file in the root directory of the original source tree.
# Found here: https://github.com/facebookresearch/Ad-Library-API-Script-Repository/tree/main
#
# Modified by the Social Media Lab to serve the Polidashboard application.
# This file is to be used with recollect_inactive.py

import json
import re
import sys
from datetime import datetime
from time import sleep
import requests

def get_ad_archive_id(data):
    """
    Extract ad_archive_id from ad_snapshot_url
    """
    return re.search(r"/\?id=([0-9]+)", data["ad_snapshot_url"]).group(1)


class FbAdsLibraryTraversal:
    default_url_pattern = (
        "https://graph.facebook.com/{}/ads_archive?unmask_removed_content=true&ad_type=POLITICAL_AND_ISSUE_ADS&access_token={}&"
        + "fields={}&search_terms={}&ad_reached_countries={}&search_page_ids={}&"
        + "ad_active_status={}&limit={}&"
        + "ad_delivery_date_min={}&"
        + "ad_delivery_date_max={}" # Adding max date to be able to query ad range more accurately to reduce API calls
    )
    default_api_version = "v23.0"

    def __init__(
        self,
        access_token,
        fields,
        search_term,
        country,
        search_page_ids="",
        ad_active_status="INACTIVE", # In this case we only care to look at inactive ads, if the ad is active then the main collect.py should pick it up
        after_date="1970-01-01",
        max_date=datetime.now().strftime('%Y-%m-%d'),
        page_limit=100,
        api_version=None,
        retry_limit=3,
    ):
        self.page_count = 0
        self.access_token = access_token
        self.fields = fields
        self.search_term = search_term
        self.country = country
        self.after_date = after_date
        self.max_date = max_date
        self.search_page_ids = search_page_ids
        self.ad_active_status = ad_active_status
        self.page_limit = page_limit
        self.retry_limit = retry_limit
        if api_version is None:
            self.api_version = self.default_api_version
        else:
            self.api_version = api_version
        # API version set (log suppressed for clean output)

    def generate_ad_archives(self):
        next_page_url = self.default_url_pattern.format(
            self.api_version,
            self.access_token,
            self.fields,
            self.search_term,
            self.country,
            self.search_page_ids,
            self.ad_active_status,
            self.page_limit,
            self.after_date,
            self.max_date
        )
        return self.__class__._get_ad_archives_from_url(
            next_page_url, country=self.country, retry_limit=self.retry_limit
        )

    @staticmethod
    def _get_ad_archives_from_url(
        next_page_url, country="unknown", retry_limit=3
    ):
        last_error_url = None
        last_retry_count = 0
        time_to_regain_access = 0

        while next_page_url is not None:
            # Implement dynamic sleep based on API feedback
            if time_to_regain_access > 0:
                print(f"API rate limit hit. Sleeping for {time_to_regain_access + 1} minutes.")
                sleep((time_to_regain_access + 1) * 60)
                time_to_regain_access = 0 # Reset after sleeping
            else:
                # Default short sleep to be a good citizen
                sleep(5)

            try:
                # API request (timestamps suppressed for clean output)
                response = requests.get(next_page_url, timeout=300)
                # API request finished
                response_data = json.loads(response.text)
            except requests.exceptions.Timeout:
                print(f"⚠️  API timeout, retrying...")
                continue
            except Exception as e:
                print(f"⚠️  Request error: {str(e)[:100]}, retrying after 60s...")
                sleep(60)
                continue

            # Parse rate limit headers
            business_use_case_usage = response.headers.get('x-business-use-case-usage', '{}')
            try:
                usage_data = json.loads(business_use_case_usage)
                # The key is the app-id, which we can get dynamically
                if usage_data:
                    first_key = next(iter(usage_data))
                    usage_info = usage_data[first_key][0]
                    time_to_regain_access = int(usage_info.get('estimated_time_to_regain_access', 0))
            except (json.JSONDecodeError, KeyError, IndexError, StopIteration) as e:
                print(f"Could not parse rate limit headers: {e}")
                time_to_regain_access = 0
                
            if "error" in response_data:
                print(f"API Error: {response_data['error']}")
                if next_page_url == last_error_url:
                    last_retry_count += 1
                    if last_retry_count >= retry_limit:
                        raise Exception(f"Retry limit exceeded for URL: {next_page_url}. Error: {response_data['error']}")
                else:
                    last_error_url = next_page_url
                    last_retry_count = 1
                
                # If there's an error, respect the sleep time
                if time_to_regain_access > 0:
                    continue
                else: # Default wait on unknown error
                    sleep(60)
                    continue

            data = response_data.get("data")
            if not data:
                # No data returned (expected at end of results)
                break
            
            yield data

            if "paging" in response_data and response_data["paging"].get("next"):
                next_page_url = response_data["paging"]["next"]
            else:
                next_page_url = None

    @classmethod
    def generate_ad_archives_from_url(cls, failure_url, after_date="1970-01-01"):
        """
        if we failed from error, later we can just continue from the last failure url
        """
        return cls._get_ad_archives_from_url(failure_url, after_date=after_date)
